"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export interface SugestaoVinculacao {
  id: string;
  station_id: string;
  station_name: string;
  provider: "solis" | "sungrow";
  uc_id: string;
  uc_codigo: string;
  empresa_id: string;
  empresa_nome?: string;
  score: number;
  status: "pendente" | "confirmada" | "rejeitada";
  created_at: string;
}

interface ActionResult {
  error?: string;
}

/**
 * Busca sugestões pendentes de vinculação (trigrama).
 */
export async function fetchSugestoesPendentes(): Promise<{
  data: SugestaoVinculacao[];
  count: number;
  error?: string;
}> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("sugestoes_vinculacao")
    .select("*, empresa:empresas(nome)")
    .eq("status", "pendente")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], count: 0, error: "Erro ao buscar sugestões." };
  }

  const sugestoes: SugestaoVinculacao[] = (data ?? []).map((row) => {
    const empresaRaw = row.empresa as unknown;
    const empresa = (Array.isArray(empresaRaw) ? empresaRaw[0] : empresaRaw) as { nome: string } | null;
    return {
      id: row.id,
      station_id: row.station_id,
      station_name: row.station_name,
      provider: row.provider as "solis" | "sungrow",
      uc_id: row.uc_id,
      uc_codigo: row.uc_codigo,
      empresa_id: row.empresa_id,
      empresa_nome: empresa?.nome ?? "",
      score: Number(row.score),
      status: row.status as SugestaoVinculacao["status"],
      created_at: row.created_at,
    };
  });

  return { data: sugestoes, count: sugestoes.length };
}

/**
 * Retorna apenas a contagem de sugestões pendentes (para o badge do sino).
 */
export async function countSugestoesPendentes(): Promise<number> {
  const supabase = await createServerClient();

  const { count, error } = await supabase
    .from("sugestoes_vinculacao")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");

  if (error) return 0;
  return count ?? 0;
}

/**
 * Confirma uma sugestão: vincula a station à UC existente.
 */
export async function confirmarSugestao(sugestaoId: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Buscar a sugestão
  const { data: sugestao, error: fetchErr } = await supabase
    .from("sugestoes_vinculacao")
    .select("station_id, provider, uc_id, empresa_id")
    .eq("id", sugestaoId)
    .single();

  if (fetchErr || !sugestao) {
    return { error: "Sugestão não encontrada." };
  }

  // Verificar se station já não foi vinculada por outro caminho
  const { data: existingLink } = await supabase
    .from("uc_stations")
    .select("uc_id")
    .eq("station_id", sugestao.station_id)
    .maybeSingle();

  if (existingLink) {
    // Já vinculada — marcar como confirmada e seguir
    await supabase
      .from("sugestoes_vinculacao")
      .update({ status: "confirmada", resolvido_at: new Date().toISOString() })
      .eq("id", sugestaoId);

    revalidatePath("/admin/sugestoes-vinculacao");
    return {};
  }

  // Criar o vínculo em uc_stations
  const { error: linkErr } = await supabase.from("uc_stations").insert({
    uc_id: sugestao.uc_id,
    station_id: sugestao.station_id,
    provider: sugestao.provider,
  });

  if (linkErr) {
    return { error: "Erro ao vincular station à UC." };
  }

  // Somar potência e inversores da station à UC
  const { data: cache } = await supabase
    .from("usinas_cache")
    .select("potencia_instalada_kwp, qtd_inversores")
    .eq("station_id", sugestao.station_id)
    .maybeSingle();

  if (cache) {
    const { data: ucAtual } = await supabase
      .from("unidades_consumidoras")
      .select("potencia_instalada_kwp, quantidade_inversores")
      .eq("id", sugestao.uc_id)
      .single();

    if (ucAtual) {
      await supabase
        .from("unidades_consumidoras")
        .update({
          potencia_instalada_kwp: (ucAtual.potencia_instalada_kwp ?? 0) + cache.potencia_instalada_kwp,
          quantidade_inversores: (ucAtual.quantidade_inversores ?? 0) + cache.qtd_inversores,
        })
        .eq("id", sugestao.uc_id);
    }
  }

  // Marcar sugestão como confirmada
  await supabase
    .from("sugestoes_vinculacao")
    .update({ status: "confirmada", resolvido_at: new Date().toISOString() })
    .eq("id", sugestaoId);

  // Remover outras sugestões pendentes para a mesma station (já vinculada)
  await supabase
    .from("sugestoes_vinculacao")
    .update({ status: "rejeitada", resolvido_at: new Date().toISOString() })
    .eq("station_id", sugestao.station_id)
    .eq("status", "pendente")
    .neq("id", sugestaoId);

  revalidatePath("/admin/sugestoes-vinculacao");
  revalidatePath("/admin/unidades");
  revalidatePath(`/admin/unidades/${sugestao.uc_id}`);
  revalidatePath("/admin/clientes", "layout");
  return {};
}

/**
 * Rejeita uma sugestão (admin decidiu que não é match).
 */
export async function rejeitarSugestao(sugestaoId: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("sugestoes_vinculacao")
    .update({ status: "rejeitada", resolvido_at: new Date().toISOString() })
    .eq("id", sugestaoId);

  if (error) {
    return { error: "Erro ao rejeitar sugestão." };
  }

  revalidatePath("/admin/sugestoes-vinculacao");
  return {};
}

/**
 * Dispara detecção de novas sugestões via RPC (pg_trgm).
 * Pode ser chamado manualmente pelo admin ou via cron.
 */
export async function detectarSugestoes(): Promise<{ count: number; error?: string }> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("detectar_sugestoes_vinculacao", {
    p_threshold: 0.3,
  });

  if (error) {
    return { count: 0, error: "Erro ao detectar sugestões." };
  }

  revalidatePath("/admin/sugestoes-vinculacao");
  return { count: data ?? 0 };
}

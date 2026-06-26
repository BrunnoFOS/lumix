"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { calcularGeracaoEstimadaUC } from "@/lib/actions/geracao-estimada";
import { classificarDesempenho } from "@/lib/geracao-estimada";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

function parseDecimal(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export async function createRelatorio(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();

  const uc_id = formData.get("uc_id") as string;
  const empresa_id = formData.get("empresa_id") as string;
  const mes_referencia = formData.get("mes_referencia") as string;
  const titulo = formData.get("titulo") as string;

  if (!uc_id || !empresa_id || !mes_referencia || !titulo) {
    return { error: "UC, empresa, mês de referência e título são obrigatórios." };
  }

  const geracao_kwh = parseDecimal(formData.get("geracao_kwh") as string);
  let geracao_estimada_kwh = parseDecimal(formData.get("geracao_estimada_kwh") as string);
  const economia_reais = parseDecimal(formData.get("economia_reais") as string);
  let indice_performance = (formData.get("indice_performance") as string) || null;
  const fatura_id = (formData.get("fatura_id") as string) || null;

  // Auto-calcular geração estimada se não fornecida
  if (geracao_estimada_kwh == null) {
    const estimativa = await calcularGeracaoEstimadaUC(uc_id, mes_referencia, geracao_kwh ?? undefined);
    if ("data" in estimativa) {
      geracao_estimada_kwh = estimativa.data.geracao_estimada_kwh;
      if (estimativa.data.indice_performance && !indice_performance) {
        indice_performance = estimativa.data.indice_performance;
      }
    }
  } else if (geracao_kwh != null && geracao_estimada_kwh > 0 && !indice_performance) {
    // Se ambos fornecidos, calcular PR
    const pr = (geracao_kwh / geracao_estimada_kwh) * 100;
    indice_performance = classificarDesempenho(pr);
  }

  const { data, error } = await supabase
    .from("relatorios")
    .insert({
      uc_id,
      empresa_id,
      mes_referencia,
      titulo,
      geracao_kwh,
      geracao_estimada_kwh,
      economia_reais,
      indice_performance,
      fatura_id,
      status_envio: "pendente",
      gerado_por: "manual",
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Erro ao criar relatório." };
  }

  revalidatePath("/admin/relatorios");
  return { data: { id: data.id } };
}

export async function updateRelatorioStatus(
  id: string,
  status_envio: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("relatorios")
    .update({ status_envio })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao atualizar status do relatório." };
  }

  revalidatePath("/admin/relatorios");
  return {};
}

export async function arquivarRelatorio(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Só pode arquivar se não for "enviado"
  const { data: rel } = await supabase
    .from("relatorios")
    .select("status_envio")
    .eq("id", id)
    .single();

  if (rel?.status_envio === "enviado") {
    return { error: "Não é possível arquivar um relatório já enviado." };
  }

  const { error } = await supabase
    .from("relatorios")
    .update({ arquivado: true })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao arquivar relatório." };
  }

  revalidatePath("/admin/relatorios");
  return {};
}

export async function desarquivarRelatorio(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("relatorios")
    .update({ arquivado: false })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao desarquivar relatório." };
  }

  revalidatePath("/admin/relatorios");
  return {};
}

export async function updateRelatorioAnexo(
  id: string,
  pdfUrl: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Só pode editar se não for "enviado"
  const { data: rel } = await supabase
    .from("relatorios")
    .select("status_envio")
    .eq("id", id)
    .single();

  if (rel?.status_envio === "enviado") {
    return { error: "Não é possível editar um relatório já enviado." };
  }

  const { error } = await supabase
    .from("relatorios")
    .update({ pdf_url: pdfUrl })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao atualizar anexo." };
  }

  revalidatePath("/admin/relatorios");
  return {};
}

export async function getRelatorios(search?: string, statusEnvio?: string, empresaId?: string) {
  const supabase = await createServerClient();

  let query = supabase
    .from("relatorios")
    .select("id, uc_id, empresa_id, mes_referencia, titulo, geracao_kwh, geracao_estimada_kwh, economia_reais, indice_performance, status_envio, gerado_por, tipo_relatorio, pdf_url, arquivado, created_at, uc:unidades_consumidoras(id, codigo_uc), empresa:empresas(id, nome)")
    .eq("arquivado", false)
    .order("mes_referencia", { ascending: false });

  if (statusEnvio && statusEnvio !== "todos") {
    query = query.eq("status_envio", statusEnvio);
  }

  if (empresaId) {
    query = query.eq("empresa_id", empresaId);
  }

  const { data, error } = await query;

  if (error) return [];

  // Normalizar relacionamentos do Supabase
  type RawRow = (typeof data)[number];
  const normalized = data.map((row: RawRow) => {
    const ucRaw = row.uc as unknown;
    const empresaRaw = row.empresa as unknown;
    return {
      ...row,
      uc: (Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw) as { id: string; codigo_uc: string } | null,
      empresa: (Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw) as { id: string; nome: string } | null,
    };
  });

  if (search) {
    const s = search.toLowerCase();
    return normalized.filter((r) =>
      r.titulo?.toLowerCase().includes(s) ||
      r.uc?.codigo_uc?.toLowerCase().includes(s) ||
      r.empresa?.nome?.toLowerCase().includes(s)
    );
  }

  return normalized;
}

export async function getRelatorio(id: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("relatorios")
    .select("id, uc_id, empresa_id, mes_referencia, titulo, pdf_url, geracao_kwh, geracao_estimada_kwh, economia_reais, indice_performance, status_envio, gerado_por, tipo_relatorio, fatura_id, arquivado, created_at, updated_at, uc:unidades_consumidoras(id, codigo_uc, titular), empresa:empresas(id, nome)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

interface FiltrosRelatorioCliente {
  ucId?: string;
  mesInicio?: string;
  mesFim?: string;
}

export async function getRelatoriosCliente(empresaIds: string | string[], filtros?: FiltrosRelatorioCliente) {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  let query = supabase
    .from("relatorios")
    .select("id, mes_referencia, titulo, geracao_kwh, geracao_estimada_kwh, economia_reais, indice_performance, status_envio, tipo_relatorio, pdf_url, uc:unidades_consumidoras(id, codigo_uc)")
    .in("empresa_id", ids)
    .eq("status_envio", "enviado")
    .order("mes_referencia", { ascending: false });

  if (filtros?.ucId) {
    query = query.eq("uc_id", filtros.ucId);
  }
  if (filtros?.mesInicio) {
    query = query.gte("mes_referencia", filtros.mesInicio);
  }
  if (filtros?.mesFim) {
    query = query.lte("mes_referencia", filtros.mesFim);
  }

  const { data, error } = await query;

  if (error) return [];

  return data.map((row) => {
    const ucRaw = row.uc as unknown;
    return {
      ...row,
      uc: (Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw) as { id: string; codigo_uc: string } | null,
    };
  });
}

export async function criarRelatorioComAnexo(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();

  const uc_id = formData.get("uc_id") as string;
  const empresa_id = formData.get("empresa_id") as string;
  const mes_referencia = formData.get("mes_referencia") as string;
  const pdf_url = (formData.get("pdf_url") as string) || null;
  const comentarioAdmin = (formData.get("comentario_admin") as string) || null;

  if (!uc_id || !empresa_id || !mes_referencia) {
    return { error: "UC, empresa e mês de referência são obrigatórios." };
  }

  if (!pdf_url) {
    return { error: "Anexo da fatura é obrigatório." };
  }

  // Buscar código da UC para o título
  const { data: uc } = await supabase
    .from("unidades_consumidoras")
    .select("codigo_uc")
    .eq("id", uc_id)
    .single();

  if (!uc) {
    return { error: "UC não encontrada." };
  }

  const mesDate = new Date(mes_referencia + "T00:00:00");
  const mesNome = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(mesDate);

  // Tentar calcular geração estimada automaticamente
  let geracao_estimada_kwh: number | null = null;
  const estimativa = await calcularGeracaoEstimadaUC(uc_id, mes_referencia);
  if ("data" in estimativa) {
    geracao_estimada_kwh = estimativa.data.geracao_estimada_kwh;
  }

  const { data, error } = await supabase
    .from("relatorios")
    .insert({
      uc_id,
      empresa_id,
      mes_referencia,
      titulo: `Relatório ${mesNome} - ${uc.codigo_uc}`,
      pdf_url,
      geracao_estimada_kwh,
      status_envio: "pendente",
      gerado_por: "manual",
      tipo_relatorio: "real",
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Erro ao criar relatório." };
  }

  // Enviar ao N8N com arquivo_url obrigatório
  const n8nUser = process.env.N8N_API_USER;
  const n8nPassword = process.env.N8N_API_PASSWORD;

  if (n8nUser && n8nPassword) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const credentials = Buffer.from(`${n8nUser}:${n8nPassword}`).toString("base64");

      await fetch(
        "https://n8n-n8n.nt4zcb.easypanel.host/webhook/7d6333a5-5c73-4be8-a3e3-937238d4f3a8",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify({
            relatorio_id: data.id,
            uc_id,
            empresa_id,
            mes_referencia,
            arquivo_url: pdf_url,
            codigo_uc: uc.codigo_uc,
            geracao_estimada_kwh,
            comentario_admin: comentarioAdmin || null,
            tipo_relatorio: "real",
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
    } catch {
      clearTimeout(timeout);
      // Relatório já criado no banco — N8N processará depois se necessário
    }
  }

  revalidatePath("/admin/relatorios");
  return { data: { id: data.id } };
}

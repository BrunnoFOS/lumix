"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

export async function getImpostos(sigla?: string) {
  const supabase = await createServerClient();

  let query = supabase
    .from("impostos_concessionaria")
    .select("id, concessionaria_sigla, uf, icms_aliquota, pis_aliquota, cofins_aliquota, vigencia_inicio, vigencia_fim, fonte_url, observacoes, created_at")
    .order("concessionaria_sigla")
    .order("vigencia_inicio", { ascending: false });

  if (sigla) {
    query = query.eq("concessionaria_sigla", sigla);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
}

export interface ImpostoVigente {
  icms_aliquota: number;
  pis_aliquota: number;
  cofins_aliquota: number;
  fator_imposto: number;
}

export async function getImpostoVigente(
  sigla: string,
  mesReferencia: string
): Promise<ImpostoVigente | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("impostos_concessionaria")
    .select("icms_aliquota, pis_aliquota, cofins_aliquota")
    .eq("concessionaria_sigla", sigla)
    .lte("vigencia_inicio", mesReferencia)
    .or(`vigencia_fim.is.null,vigencia_fim.gte.${mesReferencia}`)
    .order("vigencia_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const icms = Number(data.icms_aliquota);
  const pis = Number(data.pis_aliquota);
  const cofins = Number(data.cofins_aliquota);
  const fator = 1 / (1 - icms - pis - cofins);

  return {
    icms_aliquota: icms,
    pis_aliquota: pis,
    cofins_aliquota: cofins,
    fator_imposto: Math.round(fator * 10000) / 10000,
  };
}

export async function createImposto(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();

  const concessionaria_sigla = formData.get("concessionaria_sigla") as string;
  const uf = formData.get("uf") as string;
  const icms_aliquota = parseFloat(formData.get("icms_aliquota") as string);
  const pis_aliquota = parseFloat(formData.get("pis_aliquota") as string);
  const cofins_aliquota = parseFloat(formData.get("cofins_aliquota") as string);
  const vigencia_inicio = formData.get("vigencia_inicio") as string;
  const vigencia_fim = (formData.get("vigencia_fim") as string) || null;

  if (!concessionaria_sigla || !uf || !vigencia_inicio) {
    return { error: "Concessionária, UF e data de início são obrigatórios." };
  }

  if (isNaN(icms_aliquota) || isNaN(pis_aliquota) || isNaN(cofins_aliquota)) {
    return { error: "Alíquotas devem ser valores numéricos." };
  }

  const { data, error } = await supabase
    .from("impostos_concessionaria")
    .insert({
      concessionaria_sigla,
      uf,
      icms_aliquota,
      pis_aliquota,
      cofins_aliquota,
      vigencia_inicio,
      vigencia_fim,
      fonte_url: (formData.get("fonte_url") as string) || null,
      observacoes: (formData.get("observacoes") as string) || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Erro ao cadastrar imposto." };
  }

  revalidatePath("/admin/impostos");
  return { data: { id: data.id } };
}

export async function deleteImposto(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("impostos_concessionaria")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Erro ao remover imposto." };
  }

  revalidatePath("/admin/impostos");
  return {};
}

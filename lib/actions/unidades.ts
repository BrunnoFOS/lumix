"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { EnquadramentoTarifario, ModalidadeTarifaria } from "@/types/database";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

function parseDecimal(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function parseInt_(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

export async function createUC(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();

  const empresa_id = formData.get("empresa_id") as string;
  const codigo_uc = formData.get("codigo_uc") as string;
  const titular = formData.get("titular") as string;
  const distribuidora = formData.get("distribuidora") as string;
  const enquadramento_tarifario = formData.get("enquadramento_tarifario") as EnquadramentoTarifario;
  const potencia_instalada_kwp = parseDecimal(formData.get("potencia_instalada_kwp") as string);
  const quantidade_inversores = parseInt_(formData.get("quantidade_inversores") as string);

  if (!empresa_id || !codigo_uc || !titular || !enquadramento_tarifario) {
    return { error: "Campos obrigatórios: empresa, código UC, titular e enquadramento." };
  }

  if (!potencia_instalada_kwp || potencia_instalada_kwp <= 0) {
    return { error: "Potência instalada deve ser maior que zero." };
  }

  if (!quantidade_inversores || quantidade_inversores <= 0) {
    return { error: "Quantidade de inversores deve ser maior que zero." };
  }

  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .insert({
      empresa_id,
      codigo_uc,
      titular,
      endereco: (formData.get("endereco") as string) || null,
      cidade: (formData.get("cidade") as string) || null,
      estado: (formData.get("estado") as string) || null,
      distribuidora,
      enquadramento_tarifario,
      modalidade_tarifaria: (formData.get("modalidade_tarifaria") as string) || null,
      potencia_instalada_kwp,
      quantidade_inversores,
      modelo_inversores: (formData.get("modelo_inversores") as string) || null,
      potencia_inversor_kw: parseDecimal(formData.get("potencia_inversor_kw") as string),
      data_instalacao: (formData.get("data_instalacao") as string) || null,
      geracao_estimada_mensal_kwh: parseDecimal(formData.get("geracao_estimada_mensal_kwh") as string),
      station_id: (formData.get("station_id") as string) || null,
      observacoes: (formData.get("observacoes") as string) || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Erro ao criar unidade consumidora." };
  }

  revalidatePath("/admin/unidades");
  return { data: { id: data.id } };
}

export async function updateUC(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const codigo_uc = formData.get("codigo_uc") as string;
  const titular = formData.get("titular") as string;
  const distribuidora = formData.get("distribuidora") as string;
  const enquadramento_tarifario = formData.get("enquadramento_tarifario") as EnquadramentoTarifario;
  const potencia_instalada_kwp = parseDecimal(formData.get("potencia_instalada_kwp") as string);
  const quantidade_inversores = parseInt_(formData.get("quantidade_inversores") as string);

  if (!codigo_uc || !titular || !enquadramento_tarifario) {
    return { error: "Campos obrigatórios não preenchidos." };
  }

  if (!potencia_instalada_kwp || potencia_instalada_kwp <= 0) {
    return { error: "Potência instalada deve ser maior que zero." };
  }

  if (!quantidade_inversores || quantidade_inversores <= 0) {
    return { error: "Quantidade de inversores deve ser maior que zero." };
  }

  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .update({
      codigo_uc,
      titular,
      endereco: (formData.get("endereco") as string) || null,
      cidade: (formData.get("cidade") as string) || null,
      estado: (formData.get("estado") as string) || null,
      distribuidora,
      enquadramento_tarifario,
      modalidade_tarifaria: (formData.get("modalidade_tarifaria") as string) || null,
      potencia_instalada_kwp,
      quantidade_inversores,
      modelo_inversores: (formData.get("modelo_inversores") as string) || null,
      potencia_inversor_kw: parseDecimal(formData.get("potencia_inversor_kw") as string),
      data_instalacao: (formData.get("data_instalacao") as string) || null,
      geracao_estimada_mensal_kwh: parseDecimal(formData.get("geracao_estimada_mensal_kwh") as string),
      observacoes: (formData.get("observacoes") as string) || null,
    })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return { error: "Erro ao atualizar unidade consumidora." };
  }

  revalidatePath("/admin/unidades");
  revalidatePath(`/admin/unidades/${id}`);
  return { data: { id: data.id } };
}

export async function criarOuAtualizarUCTarifaria(
  stationId: string,
  _stationName: string,
  data: {
    grupo_tarifario: string | null;
    subgrupo: string | null;
    concessionaria_sigla: string | null;
    modalidade_tarifaria_aneel: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Buscar UC existente com esse station_id
  const { data: existing } = await supabase
    .from("unidades_consumidoras")
    .select("id")
    .eq("station_id", stationId)
    .maybeSingle();

  if (!existing) {
    return { error: "Vincule esta usina a um cliente antes de configurar a tarifa." };
  }

  const { error } = await supabase
    .from("unidades_consumidoras")
    .update(data)
    .eq("id", existing.id);

  if (error) return { error: "Erro ao atualizar classificação tarifária." };

  revalidatePath("/admin/unidades");
  return {};
}

export async function updateClassificacaoTarifaria(
  id: string,
  data: {
    grupo_tarifario: string | null;
    subgrupo: string | null;
    concessionaria_sigla: string | null;
    modalidade_tarifaria_aneel: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("unidades_consumidoras")
    .update(data)
    .eq("id", id);

  if (error) {
    return { error: "Erro ao atualizar classificação tarifária." };
  }

  revalidatePath("/admin/unidades");
  revalidatePath(`/admin/unidades/${id}`);
  return {};
}

export async function desvincularUC(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("unidades_consumidoras")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Erro ao desvincular UC." };
  }

  revalidatePath("/admin/unidades");
  revalidatePath("/admin/clientes");
  return {};
}

export async function toggleUC(
  id: string,
  ativa: boolean
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("unidades_consumidoras")
    .update({ ativa })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao alterar status da UC." };
  }

  revalidatePath("/admin/unidades");
  revalidatePath(`/admin/unidades/${id}`);
  return {};
}

export async function arquivarUC(
  id: string,
  arquivada: boolean
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("unidades_consumidoras")
    .update({ arquivada })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao arquivar/desarquivar UC." };
  }

  revalidatePath("/admin/unidades");
  revalidatePath(`/admin/unidades/${id}`);
  return {};
}

export async function getUCs(search?: string, empresaId?: string, status?: string) {
  const supabase = await createServerClient();

  let query = supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, titular, distribuidora, potencia_instalada_kwp, cidade, estado, ativa, arquivada, empresa_id, enquadramento_tarifario, modalidade_tarifaria, quantidade_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, geracao_estimada_mensal_kwh, station_id, observacoes, grupo_tarifario, subgrupo, concessionaria_sigla, modalidade_tarifaria_aneel, empresa:empresas(id, nome)")
    .order("codigo_uc");

  if (status === "ativas") {
    query = query.eq("ativa", true).eq("arquivada", false);
  } else if (status === "inativas") {
    query = query.eq("ativa", false).eq("arquivada", false);
  } else if (status === "arquivadas") {
    query = query.eq("arquivada", true);
  } else {
    query = query.eq("arquivada", false);
  }

  if (empresaId) {
    query = query.eq("empresa_id", empresaId);
  }

  if (search) {
    query = query.or(`codigo_uc.ilike.%${search}%,titular.ilike.%${search}%,distribuidora.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) return [];
  return data;
}

export async function getUC(id: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("*, empresa:empresas(id, nome, cnpj)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

interface SolisUCData {
  station_id: string;
  station_name: string;
  potencia_instalada_kwp: number;
  qtd_inversores: number;
  modelo_inversores: string[];
  potencia_inversor_kw: number;
  data_instalacao_iso: string | null;
  cidade_uf: string | null;
}

export async function vincularSolisUC(
  empresaId: string,
  solisData: SolisUCData
): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Verificar se já existe UC com esse station_id
  const { data: existing } = await supabase
    .from("unidades_consumidoras")
    .select("id")
    .eq("station_id", solisData.station_id)
    .maybeSingle();

  if (existing) {
    return { error: "Esta usina já está vinculada a uma UC." };
  }

  // Parsear cidade/estado do campo cidade_uf
  let cidade: string | null = null;
  let estado: string | null = null;
  if (solisData.cidade_uf) {
    const parts = solisData.cidade_uf.split("/");
    if (parts.length >= 2) {
      cidade = parts[0].trim();
      estado = parts[1].trim();
    }
  }

  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .insert({
      empresa_id: empresaId,
      codigo_uc: solisData.station_name,
      titular: solisData.station_name,
      distribuidora: "Solis",
      enquadramento_tarifario: "trifasico",
      modalidade_tarifaria: "convencional",
      potencia_instalada_kwp: solisData.potencia_instalada_kwp,
      quantidade_inversores: solisData.qtd_inversores,
      modelo_inversores: solisData.modelo_inversores.join(", "),
      potencia_inversor_kw: solisData.potencia_inversor_kw,
      data_instalacao: solisData.data_instalacao_iso,
      station_id: solisData.station_id,
      cidade,
      estado,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Erro ao vincular usina Solis." };
  }

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${empresaId}`);
  revalidatePath("/admin/unidades");
  return { data: { id: data.id } };
}

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
      fator_rendimento: parseDecimal(formData.get("fator_rendimento") as string),
      degradacao_ano_zero: parseDecimal(formData.get("degradacao_ano_zero") as string),
      degradacao_anos_seguintes: parseDecimal(formData.get("degradacao_anos_seguintes") as string),
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
      fator_rendimento: parseDecimal(formData.get("fator_rendimento") as string),
      degradacao_ano_zero: parseDecimal(formData.get("degradacao_ano_zero") as string),
      degradacao_anos_seguintes: parseDecimal(formData.get("degradacao_anos_seguintes") as string),
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

  // Buscar UC vinculada via uc_stations
  const { data: link } = await supabase
    .from("uc_stations")
    .select("uc_id")
    .eq("station_id", stationId)
    .maybeSingle();

  if (!link) {
    // Fallback: buscar pelo campo legado station_id na UC
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

  const { error } = await supabase
    .from("unidades_consumidoras")
    .update(data)
    .eq("id", link.uc_id);

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
    contrato_acl_rs_mwh?: number | null;
    icms_aliquota?: number | null;
    pis_aliquota?: number | null;
    cofins_aliquota?: number | null;
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

export async function updateParametrosEstimativa(
  id: string,
  dados: {
    fator_rendimento: number | null;
    degradacao_ano_zero: number | null;
    degradacao_anos_seguintes: number | null;
    data_inicio_degradacao: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("unidades_consumidoras")
    .update(dados)
    .eq("id", id);

  if (error) {
    return { error: "Erro ao atualizar parâmetros de estimativa." };
  }

  revalidatePath("/admin/unidades");
  revalidatePath(`/admin/unidades/${id}`);
  return {};
}

export async function updateUCLocalizacao(
  id: string,
  dados: {
    cidade: string;
    estado: string;
    endereco?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("unidades_consumidoras")
    .update(dados)
    .eq("id", id);

  if (error) {
    return { error: "Erro ao atualizar localização da UC." };
  }

  revalidatePath("/admin/unidades");
  revalidatePath(`/admin/unidades/${id}`);
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/dashboard");
  return {};
}

export async function desvincularUC(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Remover vínculos de stations (uc_stations) antes
  await supabase
    .from("uc_stations")
    .delete()
    .eq("uc_id", id);

  // Limpar station_id legado e arquivar a UC (soft delete)
  const { error } = await supabase
    .from("unidades_consumidoras")
    .update({ station_id: null, arquivada: true, ativa: false })
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
    .select("id, codigo_uc, titular, distribuidora, potencia_instalada_kwp, cidade, estado, ativa, arquivada, empresa_id, modelo_inversores, data_instalacao, geracao_estimada_mensal_kwh, station_id, grupo_tarifario, subgrupo, concessionaria_sigla, modalidade_tarifaria_aneel, empresa:empresas(id, nome)")
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

// Retorna UCs vinculadas com seus stations agrupados (para o seletor Empresa → UC)
export async function getUCsComStations() {
  const supabase = await createServerClient();

  const { data: links } = await supabase
    .from("uc_stations")
    .select("uc_id, station_id, provider");

  if (!links || links.length === 0) return [];

  const ucIds = [...new Set(links.map((l) => l.uc_id))];

  const { data: ucsData } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, empresa_id, empresa:empresas(id, nome)")
    .in("id", ucIds)
    .eq("ativa", true);

  if (!ucsData) return [];

  return ucsData.map((uc) => {
    const empresaRaw = uc.empresa as unknown;
    const empresa = (Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw) as { id: string; nome: string } | null;
    const stations = links
      .filter((l) => l.uc_id === uc.id)
      .map((l) => ({ station_id: l.station_id, provider: l.provider as "solis" | "sungrow" }));

    return {
      ucId: uc.id,
      codigoUc: uc.codigo_uc,
      empresaId: uc.empresa_id,
      empresaNome: empresa?.nome ?? "",
      stations,
    };
  });
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

// ——— Busca fuzzy de UCs similares via trigramas (pg_trgm) ———

export interface UCSimilar {
  uc_id: string;
  codigo_uc: string;
  score: number;
}

/**
 * Busca UCs da empresa com nome similar ao station_name usando pg_trgm.
 * Threshold: 0.3 (30% de similaridade mínima).
 */
export async function buscarUCSimilar(
  empresaId: string,
  stationName: string
): Promise<UCSimilar[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("buscar_uc_similar", {
    p_empresa_id: empresaId,
    p_nome: stationName,
    p_threshold: 0.3,
  });

  if (error || !data) return [];
  return data as UCSimilar[];
}

/**
 * Cria uma nova UC a partir de dados de uma station (Solis/SunGrow)
 * e vincula na tabela uc_stations. Não faz matching automático.
 */
export async function vincularSolisUC(
  empresaId: string,
  solisData: SolisUCData
): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Verificar se já existe vínculo para esse station_id
  const { data: existingLink } = await supabase
    .from("uc_stations")
    .select("uc_id")
    .eq("station_id", solisData.station_id)
    .maybeSingle();

  if (existingLink) {
    return { error: "Esta usina já está vinculada a uma UC." };
  }

  // Detectar provider via usinas_cache
  const { data: cacheRow } = await supabase
    .from("usinas_cache")
    .select("provider")
    .eq("station_id", solisData.station_id)
    .maybeSingle();

  const provider = cacheRow?.provider ?? "solis";

  // Criar nova UC
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
      distribuidora: provider === "sungrow" ? "SunGrow" : "Solis",
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
    return { error: "Erro ao vincular usina." };
  }

  // Criar vínculo em uc_stations
  await supabase.from("uc_stations").insert({
    uc_id: data.id,
    station_id: solisData.station_id,
    provider,
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${empresaId}`);
  revalidatePath("/admin/unidades");
  return { data: { id: data.id } };
}

// Vincular um station_id adicional a uma UC já existente (multi-provedor)
// Opcionalmente soma potência e inversores da station na UC
export async function vincularStationAUC(
  ucId: string,
  stationId: string,
  provider: "solis" | "sungrow",
  stationData?: { potencia_kwp: number; qtd_inversores: number }
): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Verificar se station_id já está vinculado a outra UC
  const { data: existingLink } = await supabase
    .from("uc_stations")
    .select("uc_id")
    .eq("station_id", stationId)
    .maybeSingle();

  if (existingLink) {
    return { error: "Esta usina já está vinculada a uma UC." };
  }

  const { error } = await supabase.from("uc_stations").insert({
    uc_id: ucId,
    station_id: stationId,
    provider,
  });

  if (error) {
    return { error: "Erro ao vincular usina adicional." };
  }

  // Somar potência e inversores na UC existente
  if (stationData) {
    const { data: ucAtual } = await supabase
      .from("unidades_consumidoras")
      .select("potencia_instalada_kwp, quantidade_inversores")
      .eq("id", ucId)
      .single();

    if (ucAtual) {
      await supabase
        .from("unidades_consumidoras")
        .update({
          potencia_instalada_kwp: (ucAtual.potencia_instalada_kwp ?? 0) + stationData.potencia_kwp,
          quantidade_inversores: (ucAtual.quantidade_inversores ?? 0) + stationData.qtd_inversores,
        })
        .eq("id", ucId);
    }
  }

  revalidatePath("/admin/unidades");
  revalidatePath("/admin/clientes");
  return {};
}

// Buscar todos os station_ids vinculados a uma UC
export async function getCidadesGHI(uf: string): Promise<string[]> {
  if (!uf || uf.length !== 2) return [];

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("ghi_municipios")
    .select("nome")
    .eq("uf", uf.toUpperCase())
    .order("nome");

  if (error || !data) return [];

  // Capitalizar cada palavra para exibição (tabela armazena lowercase sem acentos)
  return data.map((row) =>
    row.nome
      .split(" ")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export async function getUCStations(ucId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("uc_stations")
    .select("station_id, provider")
    .eq("uc_id", ucId);

  if (error) return [];
  return data;
}

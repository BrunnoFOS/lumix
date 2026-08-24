"use server";

import { createServerClient } from "@/lib/supabase/server";
import { calcularGeracaoEstimadaUC } from "@/lib/actions/geracao-estimada";
import { lookupTarifasUC } from "@/lib/actions/tarifas-aneel";
import { calcularFatorImposto } from "@/lib/geracao-estimada";

/**
 * Calcula a economia estimada para uma UC em um mês específico.
 * Recalcula em tempo real com base nas tarifas atuais e geração real.
 */
async function calcularEconomiaUC(
  ucId: string,
  mesReferencia: string,
  geracaoKwh: number
): Promise<{ economia_rs: number }> {
  const supabase = await createServerClient();

  // Buscar dados da UC
  const { data: uc } = await supabase
    .from("unidades_consumidoras")
    .select("codigo_uc, concessionaria_sigla, subgrupo, modalidade_tarifaria_aneel, grupo_tarifario, contrato_acl_rs_mwh")
    .eq("id", ucId)
    .single();

  if (!uc || !uc.concessionaria_sigla || !uc.subgrupo) {
    console.log(`[calcularEconomiaUC] UC sem concessionaria_sigla ou subgrupo:`, uc?.codigo_uc);
    return { economia_rs: 0 };
  }

  console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: concessionaria=${uc.concessionaria_sigla}, subgrupo=${uc.subgrupo}, grupo=${uc.grupo_tarifario}, geração=${geracaoKwh}kWh`);

  // Buscar tarifas
  const tarifas = await lookupTarifasUC(
    uc.concessionaria_sigla,
    uc.subgrupo,
    uc.modalidade_tarifaria_aneel ?? null,
    uc.grupo_tarifario ?? "grupo_b",
    mesReferencia
  );

  if (!tarifas) {
    console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: SEM TARIFAS para ${uc.concessionaria_sigla}/${uc.subgrupo}/${mesReferencia}`);
    return { economia_rs: 0 };
  }

  console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: tarifas encontradas`, tarifas);

  // Buscar impostos para calcular fator
  const { data: impostos } = await supabase
    .from("impostos_concessionaria")
    .select("icms_aliquota, pis_aliquota, cofins_aliquota")
    .eq("concessionaria_sigla", uc.concessionaria_sigla)
    .lte("vigencia_inicio", mesReferencia)
    .or(`vigencia_fim.gte.${mesReferencia},vigencia_fim.is.null`)
    .maybeSingle();

  if (!impostos) {
    console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: SEM IMPOSTOS para ${uc.concessionaria_sigla}`);
  }

  const fator = impostos
    ? calcularFatorImposto(
        Number(impostos.icms_aliquota),
        Number(impostos.pis_aliquota),
        Number(impostos.cofins_aliquota)
      )
    : 1;

  console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: fator imposto = ${fator}`);

  let economia = 0;

  if (tarifas.grupo === "grupo_b" && tarifas.tusd != null && tarifas.te != null) {
    // Grupo B: tarifa única (TUSD + TE) × fator imposto
    const tusdImp = tarifas.tusd * fator;
    const teImp = tarifas.te * fator;
    const tarifa = tusdImp + teImp;
    economia = geracaoKwh * tarifa;
    console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: Grupo B - TUSD=${tarifas.tusd}, TE=${tarifas.te}, tarifa_total=${tarifa}, economia=${economia}`);
  } else if (tarifas.grupo === "acl" && tarifas.tusd_fora_ponta != null && uc.contrato_acl_rs_mwh) {
    // ACL: TUSD_fp × fator imposto + contrato ACL
    const tusdFpImp = tarifas.tusd_fora_ponta * fator;
    const contratoKwh = Number(uc.contrato_acl_rs_mwh) / 1000;
    const tarifa = tusdFpImp + contratoKwh;
    economia = geracaoKwh * tarifa;
    console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: ACL - TUSD_FP=${tarifas.tusd_fora_ponta}, contrato=${contratoKwh}, tarifa_total=${tarifa}, economia=${economia}`);
  } else if (tarifas.tusd_fora_ponta != null && tarifas.te_fora_ponta != null) {
    // Grupo A: fora ponta × fator imposto
    const tusdFpImp = tarifas.tusd_fora_ponta * fator;
    const teFpImp = tarifas.te_fora_ponta * fator;
    const tarifa = tusdFpImp + teFpImp;
    economia = geracaoKwh * tarifa;
    console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: Grupo A - TUSD_FP=${tarifas.tusd_fora_ponta}, TE_FP=${tarifas.te_fora_ponta}, tarifa_total=${tarifa}, economia=${economia}`);
  } else {
    console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: NENHUMA CONDIÇÃO ATENDIDA - tarifas.grupo=${tarifas.grupo}`);
  }

  console.log(`[calcularEconomiaUC] UC ${uc.codigo_uc}: RESULTADO FINAL = R$ ${Math.round(economia * 100) / 100}`);
  return { economia_rs: Math.round(economia * 100) / 100 };
}

/**
 * Busca IDs de UCs ativas de uma lista de empresas.
 * Centraliza a query que antes era repetida em cada função.
 */
export async function getUCIdsCliente(empresaIds: string | string[]): Promise<string[]> {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  const { data: ucs } = await supabase
    .from("unidades_consumidoras")
    .select("id")
    .in("empresa_id", ids)
    .eq("ativa", true);

  if (!ucs || ucs.length === 0) return [];
  return ucs.map((uc) => uc.id);
}

/**
 * Retorna o mes_referencia mais recente com dados de geracao para as UCs fornecidas.
 */
export async function getUltimoMesComDados(ucIds: string[]): Promise<string | undefined> {
  if (ucIds.length === 0) return undefined;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("dados_geracao")
    .select("mes_referencia")
    .in("uc_id", ucIds)
    .order("mes_referencia", { ascending: false })
    .limit(1);
  return data?.[0]?.mes_referencia ?? undefined;
}

export async function getDadosGeracaoCliente(empresaIds: string | string[], ucIds?: string[], mesesLimit = 12) {
  const supabase = await createServerClient();

  // Usa ucIds se fornecido, senão busca
  const resolvedUcIds = ucIds ?? await getUCIdsCliente(empresaIds);
  if (resolvedUcIds.length === 0) return [];

  // Limit by date range to avoid fetching unbounded history
  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - mesesLimit);
  const limiteStr = `${dataLimite.getFullYear()}-${String(dataLimite.getMonth() + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("dados_geracao")
    .select("id, uc_id, mes_referencia, geracao_kwh, geracao_estimada_kwh, irradiacao_media, performance_ratio, indice_performance")
    .in("uc_id", resolvedUcIds)
    .gte("mes_referencia", limiteStr)
    .order("mes_referencia", { ascending: false });

  if (error) return [];
  return data;
}

export async function getDadosGeracaoUC(ucId: string, meses?: number) {
  const supabase = await createServerClient();

  let query = supabase
    .from("dados_geracao")
    .select("id, mes_referencia, geracao_kwh, geracao_estimada_kwh, irradiacao_media, performance_ratio, indice_performance")
    .eq("uc_id", ucId)
    .order("mes_referencia", { ascending: true });

  if (meses) {
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - meses);
    const limiteStr = `${dataLimite.getFullYear()}-${String(dataLimite.getMonth() + 1).padStart(2, "0")}-01`;
    query = query.gte("mes_referencia", limiteStr);
  }

  const { data, error } = await query;

  if (error) return [];
  return data;
}

export async function getResumoGeracaoCliente(empresaIds: string | string[], mesReferencia?: string, ucIds?: string[]) {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  // Se nao especificado, usar mes atual
  const mes = mesReferencia || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  // Usa ucIds se fornecido, senao busca UCs com dados extras necessarios
  let ucs: { id: string; codigo_uc: string; empresa_id: string; geracao_estimada_mensal_kwh: number | null }[];

  if (ucIds) {
    // Buscar dados extras das UCs ja conhecidas
    const { data } = await supabase
      .from("unidades_consumidoras")
      .select("id, codigo_uc, empresa_id, geracao_estimada_mensal_kwh")
      .in("id", ucIds)
      .eq("ativa", true);
    ucs = data ?? [];
  } else {
    const { data } = await supabase
      .from("unidades_consumidoras")
      .select("id, codigo_uc, empresa_id, geracao_estimada_mensal_kwh")
      .in("empresa_id", ids)
      .eq("ativa", true);
    ucs = data ?? [];
  }

  if (ucs.length === 0) {
    return { geracao_total: 0, estimada_total: 0, economia_total: 0, performance: null, ucs: [] };
  }

  const resolvedUcIds = ucs.map((uc) => uc.id);

  // Buscar dados de geracao e faturas em paralelo
  const [{ data: geracoes }, { data: faturas }] = await Promise.all([
    supabase
      .from("dados_geracao")
      .select("uc_id, geracao_kwh, geracao_estimada_kwh, performance_ratio, indice_performance")
      .in("uc_id", resolvedUcIds)
      .eq("mes_referencia", mes),
    supabase
      .from("faturas")
      .select("uc_id, economia_estimada")
      .in("uc_id", resolvedUcIds)
      .eq("mes_referencia", mes),
  ]);

  const geracao_total = geracoes?.reduce((sum, g) => sum + (g.geracao_kwh || 0), 0) ?? 0;

  // Recalcular geração estimada, PR e economia com base nos parâmetros atuais da UC
  const calculosPromises = resolvedUcIds.map(async (ucId) => {
    const geracao = geracoes?.find((g) => g.uc_id === ucId);
    if (!geracao?.geracao_kwh) return null;

    const [estimativa, economia] = await Promise.all([
      calcularGeracaoEstimadaUC(ucId, mes, geracao.geracao_kwh),
      calcularEconomiaUC(ucId, mes, geracao.geracao_kwh),
    ]);

    if ("error" in estimativa) return null;

    return {
      uc_id: ucId,
      ...estimativa.data,
      economia_rs: economia.economia_rs,
    };
  });

  const calculos = (await Promise.all(calculosPromises)).filter((e): e is NonNullable<typeof e> => e !== null);

  const estimada_total = calculos.reduce((sum, e) => sum + e.geracao_estimada_kwh, 0);
  const economia_total = calculos.reduce((sum, e) => sum + e.economia_rs, 0);

  // Performance média recalculada
  const prs = calculos.filter((e) => e.pr_percent !== undefined).map((e) => e.pr_percent!);
  const avgRatio = prs.length > 0 ? prs.reduce((a, b) => a + b, 0) / prs.length : null;

  let performance: string | null = null;
  if (avgRatio !== null) {
    if (avgRatio >= 98) performance = "bom";
    else if (avgRatio >= 90) performance = "regular";
    else performance = "ruim";
  }

  const geracaoMap = new Map(
    geracoes?.map((g) => [g.uc_id, g]) ?? []
  );

  const calculosMap = new Map(
    calculos.map((e) => [e.uc_id, e])
  );

  return {
    geracao_total,
    estimada_total,
    economia_total,
    performance,
    performance_ratio: avgRatio,
    ucs: ucs.map((uc) => {
      const g = geracaoMap.get(uc.id);
      const calc = calculosMap.get(uc.id);
      return {
        id: uc.id,
        codigo_uc: uc.codigo_uc,
        geracao_kwh: g?.geracao_kwh ?? 0,
        geracao_estimada_kwh: calc?.geracao_estimada_kwh ?? g?.geracao_estimada_kwh ?? uc.geracao_estimada_mensal_kwh ?? 0,
        indice_performance: calc?.indice_performance ?? g?.indice_performance ?? null,
      };
    }),
  };
}

export async function getEconomiaCliente(empresaIds: string | string[], ucIds?: string[], mesesLimit = 12) {
  const supabase = await createServerClient();

  // Usa ucIds se fornecido, senao busca
  const resolvedUcIds = ucIds ?? await getUCIdsCliente(empresaIds);
  if (resolvedUcIds.length === 0) return [];

  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - mesesLimit);
  const limiteStr = `${dataLimite.getFullYear()}-${String(dataLimite.getMonth() + 1).padStart(2, "0")}-01`;

  // Buscar dados de geração dos últimos meses
  const { data: geracoes, error } = await supabase
    .from("dados_geracao")
    .select("uc_id, mes_referencia, geracao_kwh")
    .in("uc_id", resolvedUcIds)
    .gte("mes_referencia", limiteStr)
    .order("mes_referencia", { ascending: false });

  if (error || !geracoes) return [];

  // Calcular economia em tempo real para cada UC/mês
  const economiaPromises = geracoes.map(async (g) => {
    if (!g.geracao_kwh) return null;

    const economia = await calcularEconomiaUC(g.uc_id, g.mes_referencia, g.geracao_kwh);

    return {
      uc_id: g.uc_id,
      mes_referencia: g.mes_referencia,
      economia_estimada: economia.economia_rs,
    };
  });

  const resultados = await Promise.all(economiaPromises);
  return resultados.filter((r): r is NonNullable<typeof r> => r !== null && r.economia_estimada > 0);
}

export async function getUCsCliente(empresaIds: string | string[]) {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, titular, endereco, cidade, estado, distribuidora, enquadramento_tarifario, modalidade_tarifaria, potencia_instalada_kwp, quantidade_modulos, modelo_modulos, potencia_modulo_w, quantidade_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, geracao_estimada_mensal_kwh, ativa, observacoes")
    .in("empresa_id", ids)
    .eq("ativa", true)
    .order("codigo_uc");

  if (error) return [];
  return data;
}

export interface InversorDetalhe {
  id: string;
  sn: string;
  model: string;
  product_model: string;
  power_kwp: number;
  state: number; // 1=Online, 2=Offline, 3=Alarme
}

export interface UCInversores {
  uc_id: string;
  inversores: InversorDetalhe[];
  synced_at: string | null;
  provider: string;
}

export interface UsinaOfflineInfo {
  uc_id: string;
  codigo_uc: string;
  station_name: string;
  inversores_offline: number;
  inversores_total: number;
  inversores_alarme: number;
}

/**
 * Verifica se alguma usina do cliente tem inversores offline ou em alarme.
 * Retorna lista de UCs com problemas (para exibir notificação no dashboard).
 */
export async function getUsinasOfflineCliente(empresaId: string): Promise<UsinaOfflineInfo[]> {
  const supabase = await createServerClient();

  // Buscar UCs ativas da empresa
  const { data: ucs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc")
    .eq("empresa_id", empresaId)
    .eq("ativa", true);

  if (!ucs || ucs.length === 0) return [];

  const ucIds = ucs.map((uc) => uc.id);
  const ucMap = new Map(ucs.map((uc) => [uc.id, uc.codigo_uc]));

  // Buscar stations vinculadas
  const { data: stations } = await supabase
    .from("uc_stations")
    .select("uc_id, station_id")
    .in("uc_id", ucIds);

  if (!stations || stations.length === 0) return [];

  const stationIds = stations.map((s) => s.station_id);

  // Buscar cache com dados de inversores
  const { data: cache } = await supabase
    .from("usinas_cache")
    .select("station_id, station_name, inversores_detalhe")
    .in("station_id", stationIds);

  if (!cache) return [];

  const cacheMap = new Map(cache.map((c) => [c.station_id, c]));

  const result: UsinaOfflineInfo[] = [];

  // Agrupar por UC
  const ucStationsMap = new Map<string, string[]>();
  for (const s of stations) {
    const list = ucStationsMap.get(s.uc_id) ?? [];
    list.push(s.station_id);
    ucStationsMap.set(s.uc_id, list);
  }

  for (const [ucId, stIds] of ucStationsMap) {
    let totalInv = 0;
    let offlineInv = 0;
    let alarmeInv = 0;
    let stationName = "";

    for (const stId of stIds) {
      const cached = cacheMap.get(stId);
      if (!cached) continue;
      if (!stationName) stationName = cached.station_name;
      const inversores = (cached.inversores_detalhe as InversorDetalhe[]) || [];
      for (const inv of inversores) {
        totalInv++;
        if (inv.state === 2) offlineInv++;
        if (inv.state === 3) alarmeInv++;
      }
    }

    if (offlineInv > 0 || alarmeInv > 0) {
      result.push({
        uc_id: ucId,
        codigo_uc: ucMap.get(ucId) ?? "",
        station_name: stationName,
        inversores_offline: offlineInv,
        inversores_total: totalInv,
        inversores_alarme: alarmeInv,
      });
    }
  }

  return result;
}

export async function getInversoresCliente(ucIds: string[]): Promise<UCInversores[]> {
  if (ucIds.length === 0) return [];

  const supabase = await createServerClient();

  // Buscar stations vinculadas as UCs
  const { data: stations } = await supabase
    .from("uc_stations")
    .select("uc_id, station_id, provider")
    .in("uc_id", ucIds);

  if (!stations || stations.length === 0) return [];

  const stationIds = stations.map((s) => s.station_id);

  // Buscar cache com inversores_detalhe
  const { data: cache } = await supabase
    .from("usinas_cache")
    .select("station_id, inversores_detalhe, synced_at")
    .in("station_id", stationIds);

  if (!cache) return [];

  const cacheMap = new Map(cache.map((c) => [c.station_id, c]));

  const result: UCInversores[] = [];

  for (const station of stations) {
    const cached = cacheMap.get(station.station_id);
    if (cached) {
      result.push({
        uc_id: station.uc_id,
        inversores: (cached.inversores_detalhe as InversorDetalhe[]) || [],
        synced_at: cached.synced_at,
        provider: station.provider,
      });
    }
  }

  return result;
}

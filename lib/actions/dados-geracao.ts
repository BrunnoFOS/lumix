"use server";

import { createServerClient } from "@/lib/supabase/server";

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
  const estimada_total = geracoes?.reduce((sum, g) => sum + (g.geracao_estimada_kwh || 0), 0) ?? 0;
  const economia_total = faturas?.reduce((sum, f) => sum + (f.economia_estimada || 0), 0) ?? 0;

  // Performance media
  const ratios = geracoes?.filter((g) => g.performance_ratio !== null).map((g) => g.performance_ratio!) ?? [];
  const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;

  let performance: string | null = null;
  if (avgRatio !== null) {
    if (avgRatio >= 98) performance = "bom";
    else if (avgRatio >= 90) performance = "regular";
    else performance = "ruim";
  }

  const geracaoMap = new Map(
    geracoes?.map((g) => [g.uc_id, g]) ?? []
  );

  return {
    geracao_total,
    estimada_total,
    economia_total,
    performance,
    performance_ratio: avgRatio,
    ucs: ucs.map((uc) => {
      const g = geracaoMap.get(uc.id);
      return {
        id: uc.id,
        codigo_uc: uc.codigo_uc,
        geracao_kwh: g?.geracao_kwh ?? 0,
        geracao_estimada_kwh: g?.geracao_estimada_kwh ?? uc.geracao_estimada_mensal_kwh ?? 0,
        indice_performance: g?.indice_performance ?? null,
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

  const { data, error } = await supabase
    .from("faturas")
    .select("uc_id, mes_referencia, economia_estimada")
    .in("uc_id", resolvedUcIds)
    .not("economia_estimada", "is", null)
    .gte("mes_referencia", limiteStr)
    .order("mes_referencia", { ascending: false });

  if (error) return [];
  return data;
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

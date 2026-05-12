"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function getDadosGeracaoCliente(empresaIds: string | string[]) {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  // Buscar UCs de todas as empresas acessíveis
  const { data: ucs } = await supabase
    .from("unidades_consumidoras")
    .select("id")
    .in("empresa_id", ids)
    .eq("ativa", true);

  if (!ucs || ucs.length === 0) return [];

  const ucIds = ucs.map((uc) => uc.id);

  const { data, error } = await supabase
    .from("dados_geracao")
    .select("id, uc_id, mes_referencia, geracao_kwh, geracao_estimada_kwh, irradiacao_media, performance_ratio, indice_performance")
    .in("uc_id", ucIds)
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

export async function getResumoGeracaoCliente(empresaIds: string | string[], mesReferencia?: string) {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  // Se não especificado, usar mês atual
  const mes = mesReferencia || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  // Buscar UCs de todas as empresas
  const { data: ucs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, empresa_id, geracao_estimada_mensal_kwh")
    .in("empresa_id", ids)
    .eq("ativa", true);

  if (!ucs || ucs.length === 0) {
    return { geracao_total: 0, estimada_total: 0, economia_total: 0, performance: null, ucs: [] };
  }

  const ucIds = ucs.map((uc) => uc.id);

  // Buscar dados de geração e faturas em paralelo
  const [{ data: geracoes }, { data: faturas }] = await Promise.all([
    supabase
      .from("dados_geracao")
      .select("uc_id, geracao_kwh, geracao_estimada_kwh, performance_ratio, indice_performance")
      .in("uc_id", ucIds)
      .eq("mes_referencia", mes),
    supabase
      .from("faturas")
      .select("uc_id, economia_estimada")
      .in("uc_id", ucIds)
      .eq("mes_referencia", mes),
  ]);

  const geracao_total = geracoes?.reduce((sum, g) => sum + (g.geracao_kwh || 0), 0) ?? 0;
  const estimada_total = geracoes?.reduce((sum, g) => sum + (g.geracao_estimada_kwh || 0), 0) ?? 0;
  const economia_total = faturas?.reduce((sum, f) => sum + (f.economia_estimada || 0), 0) ?? 0;

  // Performance média
  const ratios = geracoes?.filter((g) => g.performance_ratio !== null).map((g) => g.performance_ratio!) ?? [];
  const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;

  let performance: string | null = null;
  if (avgRatio !== null) {
    if (avgRatio >= 80) performance = "bom";
    else if (avgRatio >= 60) performance = "regular";
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

export async function getUCsCliente(empresaIds: string | string[]) {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, titular, endereco, cidade, estado, distribuidora, enquadramento_tarifario, modalidade_tarifaria, potencia_instalada_kwp, quantidade_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, geracao_estimada_mensal_kwh, ativa, observacoes")
    .in("empresa_id", ids)
    .eq("ativa", true)
    .order("codigo_uc");

  if (error) return [];
  return data;
}

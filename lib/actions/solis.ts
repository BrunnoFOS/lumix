"use server";

import { unstable_cache } from "next/cache";

// ——— Tipos de geração mensal ———

export interface SolisGeracaoDia {
  date: string;
  date_br: string;
  geracao_kwh: number;
  performance_ratio: number;
}

export interface SolisGeracaoMensal {
  usina: {
    station_id: string;
    station_name: string;
    capacity_kwp: number;
  };
  periodo: {
    mes: string;
    mes_extenso: string;
    data_inicio: string;
    data_inicio_br: string;
    data_fim: string;
    data_fim_br: string;
    dias_com_dados: number;
    dias_do_mes: number;
  };
  totais: {
    geracao_kwh: number;
    grid_sell_kwh: number;
    grid_purchased_kwh: number;
    home_load_kwh: number;
  };
  metricas: {
    media_diaria_kwh: number;
    mediana_diaria_kwh: number;
    melhor_dia: { date: string; date_br: string; geracao_kwh: number };
    pior_dia: { date: string; date_br: string; geracao_kwh: number };
    pr_medio: number;
    pr_max: number;
    pr_min: number;
    dias_abaixo_pr1: number;
  };
  projecao: {
    kwh_mes_completo: number;
    completude_pct: number;
  };
  dias: SolisGeracaoDia[];
}

export async function fetchSolisGeracaoMensal(
  stationId: string,
  month: string
): Promise<{ data: SolisGeracaoMensal | null; error?: string }> {
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;

  if (!user || !password) {
    return { data: null, error: "Variáveis de ambiente N8N não configuradas." };
  }

  try {
    const credentials = Buffer.from(`${user}:${password}`).toString("base64");
    const url = `https://n8n-n8n.nt4zcb.easypanel.host/webhook/solis-geracao-mensal?month=${month}&station_id=${stationId}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({}),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return {
        data: null,
        error: `Erro ao buscar geração mensal (${res.status}).`,
      };
    }

    const raw = await res.json();
    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result || !result.usina) {
      return { data: null, error: "Resposta inválida do serviço Solis." };
    }

    return { data: result as SolisGeracaoMensal };
  } catch {
    return { data: null, error: "Erro de conexão com o serviço Solis." };
  }
}

// ——— Tipos de UCs (compartilhado Solis + SunGrow) ———

export interface UsinaInversor {
  id: string;
  sn: string;
  model: string;
  product_model: string;
  power_kw: number;
  state: number; // 1=Online, 2=Offline, 3=Alarme
}

export interface UsinaUC {
  station_id: string;
  station_name: string;
  cidade_uf: string | null;
  potencia_instalada_kwp: number;
  potencia_instalada_display?: string;
  qtd_inversores: number;
  modelo_inversores: string[];
  potencia_inversor_kw: number;
  potencia_inversor_display?: string;
  data_instalacao: string | null;
  data_instalacao_iso: string | null;
  inversores_detalhe: UsinaInversor[];
}

// Mantém alias para compatibilidade
export type SolisUC = UsinaUC;

// ——— Busca de UCs via Supabase (cache populado pelo cron n8n) ———

import { createServerClient } from "@/lib/supabase/server";

interface UsinaCacheRow {
  station_id: string;
  provider: string;
  station_name: string;
  cidade_uf: string | null;
  potencia_instalada_kwp: number;
  qtd_inversores: number;
  modelo_inversores: string[];
  potencia_inversor_kw: number;
  data_instalacao: string | null;
  inversores_detalhe: UsinaInversor[];
  synced_at: string;
}

function cacheRowToUsinaUC(row: UsinaCacheRow): UsinaUC {
  return {
    station_id: row.station_id,
    station_name: row.station_name,
    cidade_uf: row.cidade_uf,
    potencia_instalada_kwp: row.potencia_instalada_kwp,
    potencia_instalada_display: `${row.potencia_instalada_kwp} kWp`,
    qtd_inversores: row.qtd_inversores,
    modelo_inversores: row.modelo_inversores ?? [],
    potencia_inversor_kw: row.potencia_inversor_kw,
    potencia_inversor_display: `${row.potencia_inversor_kw} kW`,
    data_instalacao: row.data_instalacao,
    data_instalacao_iso: row.data_instalacao,
    inversores_detalhe: row.inversores_detalhe ?? [],
  };
}

async function fetchUCsFromCache(provider: "solis" | "sungrow"): Promise<UsinaUC[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("usinas_cache")
    .select("*")
    .eq("provider", provider)
    .order("station_name");

  if (error || !data) return [];
  return (data as UsinaCacheRow[]).map(cacheRowToUsinaUC);
}

// Fallback: webhook direto (usado se cache vazio, ex: Solis antes do cron popular)

const WEBHOOK_SOLIS = "https://n8n-n8n.nt4zcb.easypanel.host/webhook/sync-ucs-solis";

function getCredentials(): string | null {
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;
  if (!user || !password) return null;
  return Buffer.from(`${user}:${password}`).toString("base64");
}

async function fetchSolisFromWebhook(): Promise<UsinaUC[]> {
  const credentials = getCredentials();
  if (!credentials) return [];

  const res = await fetch(WEBHOOK_SOLIS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) return [];

  const raw = await res.json();
  const ucs: UsinaUC[] = Array.isArray(raw) ? raw : [];

  const seen = new Set<string>();
  return ucs.filter((uc) => {
    if (seen.has(uc.station_id)) return false;
    seen.add(uc.station_id);
    return true;
  });
}

const getCachedSolisWebhook = unstable_cache(
  fetchSolisFromWebhook,
  ["solis-ucs-webhook"],
  { revalidate: 300 }
);

export async function fetchSolisUCs(): Promise<{
  data: UsinaUC[];
  error?: string;
}> {
  try {
    // Tenta cache Supabase primeiro
    const cached = await fetchUCsFromCache("solis");
    if (cached.length > 0) return { data: cached };

    // Fallback: webhook direto
    const data = await getCachedSolisWebhook();
    return { data };
  } catch {
    return { data: [], error: "Erro ao buscar usinas Solis." };
  }
}

export async function fetchSungrowUCs(): Promise<{
  data: UsinaUC[];
  error?: string;
}> {
  try {
    // Lê sempre do cache Supabase (populado pelo cron n8n)
    const data = await fetchUCsFromCache("sungrow");
    return { data };
  } catch {
    return { data: [], error: "Erro ao buscar usinas SunGrow." };
  }
}

// ——— Geração mensal SunGrow ———

const WEBHOOK_GERACAO_SUNGROW =
  "https://n8n-n8n.nt4zcb.easypanel.host/webhook/geracao-mensal-sungrow";

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function mesExtenso(mes: string): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const [year, month] = mes.split("-");
  const idx = parseInt(month, 10) - 1;
  return `${meses[idx] ?? month}/${year}`;
}

function normalizeSungrowToGeracaoMensal(
  raw: Record<string, unknown>,
  stationId: string
): SolisGeracaoMensal {
  const usina = raw.usina as Record<string, unknown> | undefined;
  const periodo = raw.periodo as Record<string, unknown> | undefined;
  const totais = raw.totais as Record<string, unknown> | undefined;
  const metricas = raw.metricas as Record<string, unknown> | undefined;
  const projecao = raw.projecao as Record<string, unknown> | undefined;
  const dias = (raw.dias as Record<string, unknown>[]) ?? [];

  const mes = String(periodo?.mes ?? "");
  const dataInicio = String(periodo?.data_inicio ?? "");
  const dataFim = String(periodo?.data_fim ?? "");

  const melhorDia = metricas?.melhor_dia as Record<string, unknown> | null;
  const piorDia = metricas?.pior_dia as Record<string, unknown> | null;

  return {
    usina: {
      station_id: String(usina?.station_id ?? stationId),
      station_name: String(usina?.station_name ?? stationId),
      capacity_kwp: Number(usina?.capacity_kwp ?? usina?.potencia_instalada_kwp ?? 0),
    },
    periodo: {
      mes,
      mes_extenso: String(periodo?.mes_extenso ?? mesExtenso(mes)),
      data_inicio: dataInicio,
      data_inicio_br: String(periodo?.data_inicio_br ?? formatDateBR(dataInicio)),
      data_fim: dataFim,
      data_fim_br: String(periodo?.data_fim_br ?? formatDateBR(dataFim)),
      dias_com_dados: Number(periodo?.dias_com_dados ?? 0),
      dias_do_mes: Number(periodo?.dias_do_mes ?? 30),
    },
    totais: {
      geracao_kwh: Number(totais?.geracao_kwh ?? 0),
      grid_sell_kwh: Number(totais?.grid_sell_kwh ?? 0),
      grid_purchased_kwh: Number(totais?.grid_purchased_kwh ?? 0),
      home_load_kwh: Number(totais?.home_load_kwh ?? 0),
    },
    metricas: {
      media_diaria_kwh: Number(metricas?.media_diaria_kwh ?? metricas?.media_diaria ?? 0),
      mediana_diaria_kwh: Number(metricas?.mediana_diaria_kwh ?? metricas?.mediana ?? 0),
      melhor_dia: {
        date: String(melhorDia?.date ?? ""),
        date_br: String(melhorDia?.date_br ?? formatDateBR(String(melhorDia?.date ?? ""))),
        geracao_kwh: Number(melhorDia?.geracao_kwh ?? 0),
      },
      pior_dia: {
        date: String(piorDia?.date ?? ""),
        date_br: String(piorDia?.date_br ?? formatDateBR(String(piorDia?.date ?? ""))),
        geracao_kwh: Number(piorDia?.geracao_kwh ?? 0),
      },
      pr_medio: Number(metricas?.pr_medio ?? 0),
      pr_max: Number(metricas?.pr_max ?? 0),
      pr_min: Number(metricas?.pr_min ?? 0),
      dias_abaixo_pr1: Number(metricas?.dias_abaixo_pr1 ?? 0),
    },
    projecao: {
      kwh_mes_completo: Number(projecao?.kwh_mes_completo ?? 0),
      completude_pct: Number(projecao?.completude_pct ?? 0),
    },
    dias: dias.map((d) => ({
      date: String(d.date ?? ""),
      date_br: String(d.date_br ?? formatDateBR(String(d.date ?? ""))),
      geracao_kwh: Number(d.geracao_kwh ?? 0),
      performance_ratio: Number(d.performance_ratio ?? 0),
    })),
  };
}

export async function fetchSungrowGeracaoMensal(
  stationId: string,
  month: string
): Promise<{ data: SolisGeracaoMensal | null; error?: string }> {
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;

  if (!user || !password) {
    return { data: null, error: "Variáveis de ambiente N8N não configuradas." };
  }

  try {
    const credentials = Buffer.from(`${user}:${password}`).toString("base64");
    const url = `${WEBHOOK_GERACAO_SUNGROW}?month=${month}&station_id=${stationId}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({}),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return { data: null, error: `Erro ao buscar geração mensal SunGrow (${res.status}).` };
    }

    const raw = await res.json();
    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result) {
      return { data: null, error: "Resposta vazia do serviço SunGrow." };
    }

    return { data: normalizeSungrowToGeracaoMensal(result, stationId) };
  } catch {
    return { data: null, error: "Erro de conexão com o serviço SunGrow." };
  }
}

// ——— Função unificada de geração mensal (detecta provider) ———

export async function fetchGeracaoMensal(
  stationId: string,
  month: string,
  provider: "solis" | "sungrow"
): Promise<{ data: SolisGeracaoMensal | null; error?: string }> {
  if (provider === "sungrow") {
    return fetchSungrowGeracaoMensal(stationId, month);
  }
  return fetchSolisGeracaoMensal(stationId, month);
}

// ——— Busca consolidada de múltiplos provedores ———

export async function fetchGeracaoMensalConsolidada(
  stations: { station_id: string; provider: "solis" | "sungrow" }[],
  month: string
): Promise<{ data: SolisGeracaoMensal | null; error?: string }> {
  if (stations.length === 0) {
    return { data: null, error: "Nenhum station_id informado." };
  }

  // Caso simples: apenas um provedor
  if (stations.length === 1) {
    return fetchGeracaoMensal(stations[0].station_id, month, stations[0].provider);
  }

  // Buscar dados de todos os provedores em paralelo
  const results = await Promise.all(
    stations.map((s) => fetchGeracaoMensal(s.station_id, month, s.provider))
  );

  // Filtrar os que retornaram dados
  const successResults = results
    .map((r) => r.data)
    .filter((d): d is SolisGeracaoMensal => d !== null);

  if (successResults.length === 0) {
    const errors = results.map((r) => r.error).filter(Boolean).join("; ");
    return { data: null, error: errors || "Nenhum provedor retornou dados." };
  }

  // Se só um retornou, usar diretamente
  if (successResults.length === 1) {
    return { data: successResults[0] };
  }

  // Consolidar: usar o primeiro como base e somar os demais
  const base = successResults[0];
  const consolidated = structuredClone(base);

  // Nome consolidado
  const allNames = successResults.map((r) => r.usina.station_name);
  const uniqueNames = [...new Set(allNames)];
  consolidated.usina.station_name = uniqueNames.length === 1
    ? uniqueNames[0]
    : uniqueNames.join(" + ");

  // Somar potências
  consolidated.usina.capacity_kwp = successResults.reduce(
    (sum, r) => sum + r.usina.capacity_kwp, 0
  );

  // Consolidar dias: agrupar por data e somar kWh
  const diasMap = new Map<string, SolisGeracaoDia>();
  for (const result of successResults) {
    for (const dia of result.dias) {
      const existing = diasMap.get(dia.date);
      if (existing) {
        existing.geracao_kwh += dia.geracao_kwh;
        // PR ponderado não é simples de somar — usamos média
        existing.performance_ratio = (existing.performance_ratio + dia.performance_ratio) / 2;
      } else {
        diasMap.set(dia.date, { ...dia });
      }
    }
  }

  consolidated.dias = Array.from(diasMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Recalcular totais
  consolidated.totais.geracao_kwh = successResults.reduce(
    (sum, r) => sum + r.totais.geracao_kwh, 0
  );
  consolidated.totais.grid_sell_kwh = successResults.reduce(
    (sum, r) => sum + r.totais.grid_sell_kwh, 0
  );
  consolidated.totais.grid_purchased_kwh = successResults.reduce(
    (sum, r) => sum + r.totais.grid_purchased_kwh, 0
  );
  consolidated.totais.home_load_kwh = successResults.reduce(
    (sum, r) => sum + r.totais.home_load_kwh, 0
  );

  // Recalcular métricas a partir dos dias consolidados
  const dias = consolidated.dias;
  const totalKwh = dias.reduce((s, d) => s + d.geracao_kwh, 0);
  const diasComDados = dias.filter((d) => d.geracao_kwh > 0).length;

  consolidated.periodo.dias_com_dados = Math.max(
    ...successResults.map((r) => r.periodo.dias_com_dados)
  );

  const mediaDiaria = diasComDados > 0 ? totalKwh / diasComDados : 0;
  const sorted = [...dias].sort((a, b) => a.geracao_kwh - b.geracao_kwh);
  const melhorDia = sorted[sorted.length - 1] ?? dias[0];
  const piorDiaPositivo = sorted.find((d) => d.geracao_kwh > 0) ?? sorted[0];

  consolidated.metricas = {
    media_diaria_kwh: mediaDiaria,
    mediana_diaria_kwh: diasComDados > 0
      ? sorted[Math.floor(sorted.length / 2)].geracao_kwh
      : 0,
    melhor_dia: {
      date: melhorDia.date,
      date_br: melhorDia.date_br,
      geracao_kwh: melhorDia.geracao_kwh,
    },
    pior_dia: {
      date: piorDiaPositivo.date,
      date_br: piorDiaPositivo.date_br,
      geracao_kwh: piorDiaPositivo.geracao_kwh,
    },
    pr_medio: dias.length > 0
      ? dias.reduce((s, d) => s + d.performance_ratio, 0) / dias.length
      : 0,
    pr_max: Math.max(...dias.map((d) => d.performance_ratio), 0),
    pr_min: Math.min(...dias.filter((d) => d.geracao_kwh > 0).map((d) => d.performance_ratio), 0),
    dias_abaixo_pr1: dias.filter((d) => d.geracao_kwh > 0 && d.performance_ratio < 1).length,
  };

  // Recalcular projeção
  const diasDoMes = consolidated.periodo.dias_do_mes;
  consolidated.projecao = {
    kwh_mes_completo: diasComDados > 0
      ? (totalKwh / diasComDados) * diasDoMes
      : 0,
    completude_pct: diasDoMes > 0
      ? Math.round((diasComDados / diasDoMes) * 100)
      : 0,
  };

  return { data: consolidated };
}

// ——— Gerar relatório via n8n ———

// Gerar relatório consolidado (múltiplos provedores)
export async function gerarRelatorioConsolidado(
  stations: { station_id: string; provider: "solis" | "sungrow" }[],
  month: string,
  dadosGeracao: SolisGeracaoMensal
): Promise<{ error?: string; success?: boolean }> {
  // Usa o primeiro station_id como referência principal e envia dados já consolidados
  const primaryStationId = stations[0]?.station_id;
  if (!primaryStationId) return { error: "Nenhum station_id informado." };

  return gerarRelatorioSolis(primaryStationId, month, dadosGeracao);
}

export async function gerarRelatorioSolis(
  stationId: string,
  month: string,
  dadosGeracao: SolisGeracaoMensal
): Promise<{ error?: string; success?: boolean }> {
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;

  if (!user || !password) {
    return { error: "Variáveis de ambiente N8N não configuradas." };
  }

  // Buscar UC vinculada para calcular geração estimada, PR% e tarifas
  const supabase = await createServerClient();
  const { calcularGeracaoEstimadaUC } = await import("@/lib/actions/geracao-estimada");
  const { classificarDesempenho } = await import("@/lib/geracao-estimada");
  const { lookupTarifasUC } = await import("@/lib/actions/tarifas-aneel");
  const { getImpostoVigente } = await import("@/lib/actions/impostos");

  let estimativa: {
    geracao_estimada_kwh: number | null;
    pr_percentual: number | null;
    pr_classificacao: string | null;
    pr_texto: string | null;
    degradacao_acumulada: number | null;
    ghi_wh_m2_dia: number | null;
  } = {
    geracao_estimada_kwh: null,
    pr_percentual: null,
    pr_classificacao: null,
    pr_texto: null,
    degradacao_acumulada: null,
    ghi_wh_m2_dia: null,
  };

  let ucInfo: {
    grupo_tarifario: string | null;
    subgrupo: string | null;
    concessionaria_sigla: string | null;
    modalidade_tarifaria_aneel: string | null;
    contrato_acl_rs_mwh: number | null;
    codigo_uc: string | null;
  } = {
    grupo_tarifario: null,
    subgrupo: null,
    concessionaria_sigla: null,
    modalidade_tarifaria_aneel: null,
    contrato_acl_rs_mwh: null,
    codigo_uc: null,
  };

  let tarifas: {
    grupo: string;
    tusd?: number;
    te?: number;
    tusd_ponta?: number;
    te_ponta?: number;
    tusd_fora_ponta?: number;
    te_fora_ponta?: number;
  } | null = null;

  let economia: {
    economia_estimada_rs: number | null;
    formula: string | null;
  } = { economia_estimada_rs: null, formula: null };

  let impostos: {
    icms_aliquota: number | null;
    pis_aliquota: number | null;
    cofins_aliquota: number | null;
    fator_imposto: number | null;
  } = { icms_aliquota: null, pis_aliquota: null, cofins_aliquota: null, fator_imposto: null };

  let tarifas_com_impostos: {
    tusd?: number;
    te?: number;
    tusd_fora_ponta?: number;
    te_fora_ponta?: number;
    tusd_ponta?: number;
    te_ponta?: number;
  } | null = null;

  // Buscar UC pelo station_id (via uc_stations ou legado)
  const { data: link } = await supabase
    .from("uc_stations")
    .select("uc_id")
    .eq("station_id", stationId)
    .maybeSingle();

  let ucId = link?.uc_id;
  if (!ucId) {
    const { data: ucLegado } = await supabase
      .from("unidades_consumidoras")
      .select("id")
      .eq("station_id", stationId)
      .maybeSingle();
    ucId = ucLegado?.id;
  }

  if (ucId) {
    const mesRef = `${month}-01`;
    const geracaoReal = dadosGeracao.totais.geracao_kwh;

    // Buscar dados da UC
    const { data: ucData } = await supabase
      .from("unidades_consumidoras")
      .select("codigo_uc, grupo_tarifario, subgrupo, concessionaria_sigla, modalidade_tarifaria_aneel, contrato_acl_rs_mwh")
      .eq("id", ucId)
      .single();

    if (ucData) {
      ucInfo = {
        grupo_tarifario: ucData.grupo_tarifario,
        subgrupo: ucData.subgrupo,
        concessionaria_sigla: ucData.concessionaria_sigla,
        modalidade_tarifaria_aneel: ucData.modalidade_tarifaria_aneel,
        contrato_acl_rs_mwh: ucData.contrato_acl_rs_mwh ? Number(ucData.contrato_acl_rs_mwh) : null,
        codigo_uc: ucData.codigo_uc,
      };

      // Buscar tarifas ANEEL e impostos vigentes no mês de referência
      if (ucData.concessionaria_sigla && ucData.subgrupo && ucData.grupo_tarifario) {
        const [tarifasResult, impostoResult] = await Promise.all([
          lookupTarifasUC(
            ucData.concessionaria_sigla,
            ucData.subgrupo,
            ucData.modalidade_tarifaria_aneel,
            ucData.grupo_tarifario,
            mesRef
          ),
          getImpostoVigente(ucData.concessionaria_sigla, mesRef),
        ]);

        if (tarifasResult) {
          tarifas = tarifasResult;
        }

        // Fator de impostos (1 se não houver cadastro)
        const fator = impostoResult?.fator_imposto ?? 1;
        if (impostoResult) {
          impostos = {
            icms_aliquota: impostoResult.icms_aliquota,
            pis_aliquota: impostoResult.pis_aliquota,
            cofins_aliquota: impostoResult.cofins_aliquota,
            fator_imposto: impostoResult.fator_imposto,
          };
        }

        if (tarifasResult) {
          // Calcular economia estimada por grupo com impostos
          if (tarifasResult.grupo === "grupo_b" && tarifasResult.tusd != null && tarifasResult.te != null) {
            // Grupo B: tarifa única (TUSD + TE) × fator imposto
            const tusdImp = tarifasResult.tusd * fator;
            const teImp = tarifasResult.te * fator;
            const tarifa = tusdImp + teImp;
            tarifas_com_impostos = { tusd: tusdImp, te: teImp };
            economia = {
              economia_estimada_rs: Math.round(geracaoReal * tarifa * 100) / 100,
              formula: `${geracaoReal.toFixed(1)} kWh × R$ ${tarifa.toFixed(6)}/kWh (TUSD + TE com impostos, fator ${fator.toFixed(4)})`,
            };
          } else if (tarifasResult.grupo === "acl" && tarifasResult.tusd_fora_ponta != null && ucData.contrato_acl_rs_mwh) {
            // ACL: TUSD_fp × fator imposto + contrato ACL (já inclui impostos próprios)
            const tusdFpImp = tarifasResult.tusd_fora_ponta * fator;
            const contratoKwh = Number(ucData.contrato_acl_rs_mwh) / 1000;
            const tarifa = tusdFpImp + contratoKwh;
            tarifas_com_impostos = { tusd_fora_ponta: tusdFpImp };
            economia = {
              economia_estimada_rs: Math.round(geracaoReal * tarifa * 100) / 100,
              formula: `${geracaoReal.toFixed(1)} kWh × R$ ${tarifa.toFixed(6)}/kWh (TUSD_fp com impostos + Contrato ACL R$ ${contratoKwh.toFixed(6)}/kWh)`,
            };
          } else if (tarifasResult.tusd_fora_ponta != null && tarifasResult.te_fora_ponta != null) {
            // Grupo A: fora ponta × fator imposto
            const tusdFpImp = tarifasResult.tusd_fora_ponta * fator;
            const teFpImp = tarifasResult.te_fora_ponta * fator;
            const tarifa = tusdFpImp + teFpImp;
            tarifas_com_impostos = {
              tusd_fora_ponta: tusdFpImp,
              te_fora_ponta: teFpImp,
              tusd_ponta: tarifasResult.tusd_ponta ? tarifasResult.tusd_ponta * fator : undefined,
              te_ponta: tarifasResult.te_ponta ? tarifasResult.te_ponta * fator : undefined,
            };
            economia = {
              economia_estimada_rs: Math.round(geracaoReal * tarifa * 100) / 100,
              formula: `${geracaoReal.toFixed(1)} kWh × R$ ${tarifa.toFixed(6)}/kWh (TUSD_fp + TE_fp com impostos, fator ${fator.toFixed(4)})`,
            };
          }
        }
      }
    }

    // Calcular estimativa e PR
    const resultado = await calcularGeracaoEstimadaUC(ucId, mesRef, geracaoReal);

    if ("data" in resultado) {
      const pr = resultado.data.pr_percent ?? null;
      const classificacao = pr != null ? classificarDesempenho(pr) : null;
      const classificacaoLabel = classificacao === "bom" ? "Bom" : classificacao === "regular" ? "Regular" : classificacao === "ruim" ? "Ruim" : null;

      estimativa = {
        geracao_estimada_kwh: resultado.data.geracao_estimada_kwh,
        pr_percentual: pr != null ? Math.round(pr * 100) / 100 : null,
        pr_classificacao: classificacaoLabel,
        pr_texto: pr != null ? `${Math.round(pr)}% do potencial da usina foi atingido — ${classificacaoLabel}` : null,
        degradacao_acumulada: resultado.data.degradacao_acumulada,
        ghi_wh_m2_dia: resultado.data.ghi_wh_m2_dia,
      };
    }
  }

  try {
    const credentials = Buffer.from(`${user}:${password}`).toString("base64");

    const res = await fetch(
      "https://n8n-n8n.nt4zcb.easypanel.host/webhook/7d6333a5-5c73-4be8-a3e3-937238d4f3a8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          station_id: stationId,
          month,
          ...dadosGeracao,
          estimativa,
          uc_info: ucInfo,
          tarifas,
          tarifas_com_impostos,
          impostos,
          economia,
        }),
      }
    );

    if (!res.ok) {
      return {
        error: `Erro ao gerar relatório (${res.status}). Verifique se a UC possui cadastro completo (concessionária, subgrupo e modalidade tarifária configurados).`,
      };
    }

    return { success: true };
  } catch (err) {
    return { error: `Erro de conexão ao gerar relatório: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ——— Buscar stations irmãos (mesma UC) via uc_stations ———

export async function getStationsSiblings(
  stationId: string
): Promise<{ station_id: string; provider: "solis" | "sungrow" }[]> {
  const supabase = await createServerClient();

  // Buscar a UC desse station_id
  const { data: link } = await supabase
    .from("uc_stations")
    .select("uc_id")
    .eq("station_id", stationId)
    .maybeSingle();

  if (!link) return [{ station_id: stationId, provider: "solis" }];

  // Buscar todos os stations dessa UC
  const { data: siblings } = await supabase
    .from("uc_stations")
    .select("station_id, provider")
    .eq("uc_id", link.uc_id);

  if (!siblings || siblings.length === 0) {
    return [{ station_id: stationId, provider: "solis" }];
  }

  return siblings as { station_id: string; provider: "solis" | "sungrow" }[];
}

// ——— Busca de geração com consolidação automática ———

export async function fetchGeracaoMensalAuto(
  stationId: string,
  month: string,
  provider: "solis" | "sungrow"
): Promise<{ data: SolisGeracaoMensal | null; error?: string; isConsolidated?: boolean }> {
  // Verificar se este station tem "irmãos" na mesma UC
  const siblings = await getStationsSiblings(stationId);

  if (siblings.length <= 1) {
    // Sem consolidação necessária
    return fetchGeracaoMensal(stationId, month, provider);
  }

  // Buscar consolidado
  const result = await fetchGeracaoMensalConsolidada(siblings, month);
  return { ...result, isConsolidated: true };
}

// ——— UCs unificadas (banco + Solis) para selectors ———

export interface UCOption {
  id: string;
  codigo_uc: string;
  empresa: { id: string; nome: string } | null;
  source: "database" | "solis";
  station_name?: string;
}

export async function getUCsComSolis(
  dbUcs: { id: string; codigo_uc: string; empresa: { id: string; nome: string } | null }[]
): Promise<UCOption[]> {
  const dbOptions: UCOption[] = dbUcs.map((uc) => ({
    ...uc,
    source: "database" as const,
  }));

  try {
    const { data: solisData } = await fetchSolisUCs();

    const solisOptions: UCOption[] = solisData
      .filter((s) => {
        // Não duplicar se já existe no banco com mesmo station_id no codigo_uc
        return !dbUcs.some((db) => db.codigo_uc === s.station_id);
      })
      .map((s) => ({
        id: `solis:${s.station_id}`,
        codigo_uc: s.station_name,
        empresa: null,
        source: "solis" as const,
        station_name: s.station_name,
      }));

    return [...dbOptions, ...solisOptions];
  } catch {
    return dbOptions;
  }
}

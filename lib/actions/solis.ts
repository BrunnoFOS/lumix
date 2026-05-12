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

// ——— Gerar relatório via n8n ———

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

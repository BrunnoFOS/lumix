"use server";

import { createServerClient } from "@/lib/supabase/server";

const WEBHOOK_ALERTAS_SOLIS =
  "https://n8n-n8n.nt4zcb.easypanel.host/webhook/sync-alarmes";
const WEBHOOK_ALERTAS_SUNGROW =
  "https://n8n-n8n.nt4zcb.easypanel.host/webhook/sync-alarmes-sungrow";

export interface AlertaSummary {
  ok: boolean;
  total: number;
  ativos: number;
  por_nivel?: { tip?: number; general?: number; emergency?: number };
  buscado_em: string;
}

export interface AlertaItem {
  station_id: string;
  station_name: string;
  inverter_sn: string;
  alarm_code: string;
  alarm_msg: string;
  advice: string;
  alarm_level: number;
  alarm_level_label: "tip" | "general" | "emergency";
  alarm_begin_time_iso: string;
  alarm_begin_time_br: string;
  alarm_end_time_iso: string;
  alarm_end_time_br: string;
  alarm_duration_minutes: number;
  state: number;
  state_label: "pending" | "processed" | "resolved";
  is_active: boolean;
  provider?: "solis" | "sungrow";
}

export interface AlertasResponse {
  summary: AlertaSummary | null;
  items: AlertaItem[];
  error?: string;
}

// ——— Leitura do cache Supabase (populado pelo cron n8n) ———

function buildSummary(items: AlertaItem[]): AlertaSummary {
  const ativos = items.filter((i) => i.is_active);
  return {
    ok: true,
    total: items.length,
    ativos: ativos.length,
    por_nivel: {
      tip: ativos.filter((i) => i.alarm_level_label === "tip").length,
      general: ativos.filter((i) => i.alarm_level_label === "general").length,
      emergency: ativos.filter((i) => i.alarm_level_label === "emergency").length,
    },
    buscado_em: new Date().toISOString(),
  };
}

async function fetchAlertasFromCache(): Promise<AlertaItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("alertas_cache")
    .select("*")
    .order("alarm_level", { ascending: false })
    .order("alarm_begin_time_iso", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    station_id: row.station_id,
    station_name: row.station_name,
    inverter_sn: row.inverter_sn ?? "",
    alarm_code: row.alarm_code ?? "",
    alarm_msg: row.alarm_msg,
    advice: row.advice ?? "",
    alarm_level: row.alarm_level,
    alarm_level_label: row.alarm_level_label as AlertaItem["alarm_level_label"],
    alarm_begin_time_iso: row.alarm_begin_time_iso,
    alarm_begin_time_br: row.alarm_begin_time_br ?? "",
    alarm_end_time_iso: row.alarm_end_time_iso ?? "",
    alarm_end_time_br: row.alarm_end_time_br ?? "",
    alarm_duration_minutes: row.alarm_duration_minutes ?? 0,
    state: row.state,
    state_label: row.state_label as AlertaItem["state_label"],
    is_active: row.is_active,
    provider: row.provider as "solis" | "sungrow",
  }));
}

// ——— Normalização de dados do webhook ———

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function normalizeAlertaItem(raw: Record<string, unknown>, provider: "solis" | "sungrow"): AlertaItem {
  // Datas: Solis usa alarm_begin_time_iso/br, SunGrow usa inicio/fim
  const beginIso = (raw.alarm_begin_time_iso as string) ?? (raw.inicio as string) ?? "";
  const endIso = (raw.alarm_end_time_iso as string) ?? (raw.fim as string) ?? "";
  const beginBr = (raw.alarm_begin_time_br as string) ?? formatDateBR(beginIso);
  const endBr = (raw.alarm_end_time_br as string) ?? formatDateBR(endIso);

  // Duração: Solis em minutos, SunGrow em ms
  let durationMinutes = raw.alarm_duration_minutes as number | undefined;
  if (durationMinutes === undefined && raw.duracao_ms) {
    durationMinutes = Math.round((raw.duracao_ms as number) / 60000);
  }

  // Inversor: SunGrow pode ter inverter_sn vazio, usar inverter_name
  const inverterSn = (raw.inverter_sn as string) || (raw.inverter_name as string) || "";

  // is_active: Solis envia explícito, SunGrow inferir de fim === null
  const isActive = raw.is_active !== undefined
    ? Boolean(raw.is_active)
    : !endIso;

  return {
    station_id: String(raw.station_id ?? ""),
    station_name: String(raw.station_name ?? ""),
    inverter_sn: inverterSn,
    alarm_code: String(raw.alarm_code ?? ""),
    alarm_msg: String(raw.alarm_msg ?? ""),
    advice: String(raw.advice ?? ""),
    alarm_level: Number(raw.alarm_level ?? 1),
    alarm_level_label: (raw.alarm_level_label as AlertaItem["alarm_level_label"]) ?? "tip",
    alarm_begin_time_iso: beginIso,
    alarm_begin_time_br: beginBr,
    alarm_end_time_iso: endIso,
    alarm_end_time_br: endBr,
    alarm_duration_minutes: durationMinutes ?? 0,
    state: Number(raw.state ?? 0),
    state_label: (raw.state_label as AlertaItem["state_label"]) ?? "pending",
    is_active: isActive,
    provider,
  };
}

// ——— Fallback: webhook direto (usado se cache vazio) ———

async function fetchAlertasFromWebhook(
  url: string,
  provider: "solis" | "sungrow",
  credentials: string
): Promise<AlertaItem[]> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({}),
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    // Primeiro item é _summary, resto são alertas
    return data
      .slice(1)
      .map((item: Record<string, unknown>) => normalizeAlertaItem(item, provider));
  } catch (err) {
    console.error(`[alertas-${provider}] webhook fallback erro:`, err);
    return [];
  }
}

// ——— Função principal ———

export async function fetchAlertas(): Promise<AlertasResponse> {
  try {
    // Tenta cache Supabase primeiro
    const cached = await fetchAlertasFromCache();

    if (cached.length > 0) {
      return {
        summary: buildSummary(cached),
        items: cached,
      };
    }

    // Fallback: webhooks diretos em paralelo
    const user = process.env.N8N_API_USER;
    const password = process.env.N8N_API_PASSWORD;

    if (!user || !password) {
      return { summary: null, items: [], error: "Variáveis N8N não configuradas." };
    }

    const credentials = Buffer.from(`${user}:${password}`).toString("base64");

    const [solis, sungrow] = await Promise.all([
      fetchAlertasFromWebhook(WEBHOOK_ALERTAS_SOLIS, "solis", credentials),
      fetchAlertasFromWebhook(WEBHOOK_ALERTAS_SUNGROW, "sungrow", credentials),
    ]);

    const items = [...solis, ...sungrow];
    const summary = items.length > 0 ? buildSummary(items) : null;

    return { summary, items };
  } catch (err) {
    console.error("[alertas] erro:", err);
    return { summary: null, items: [], error: String(err) };
  }
}

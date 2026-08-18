"use server";

import { createServerClient } from "@/lib/supabase/server";

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
    .select("station_id, station_name, inverter_sn, alarm_code, alarm_msg, advice, alarm_level, alarm_level_label, alarm_begin_time_iso, alarm_begin_time_br, alarm_end_time_iso, alarm_end_time_br, alarm_duration_minutes, state, state_label, is_active, provider")
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

// ——— Função principal ———

export async function fetchAlertas(): Promise<AlertasResponse> {
  try {
    const items = await fetchAlertasFromCache();
    const summary = items.length > 0 ? buildSummary(items) : null;

    return { summary, items };
  } catch (err) {
    return { summary: null, items: [], error: String(err) };
  }
}

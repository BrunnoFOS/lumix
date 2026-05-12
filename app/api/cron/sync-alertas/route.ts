import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SOLIS = "https://n8n-n8n.nt4zcb.easypanel.host/webhook/sync-alarmes";
const WEBHOOK_SUNGROW = "https://n8n-n8n.nt4zcb.easypanel.host/webhook/sync-alarmes-sungrow";
const CRON_SECRET = process.env.CRON_SECRET;

interface RawAlerta {
  station_id?: string;
  station_name?: string;
  inverter_sn?: string;
  inverter_name?: string;
  alarm_code?: string;
  alarm_msg?: string;
  advice?: string;
  alarm_level?: number;
  alarm_level_label?: string;
  alarm_begin_time_iso?: string;
  alarm_begin_time_br?: string;
  alarm_end_time_iso?: string;
  alarm_end_time_br?: string;
  alarm_duration_minutes?: number;
  inicio?: string;
  fim?: string | null;
  duracao_ms?: number;
  state?: number;
  state_label?: string;
  is_active?: boolean;
  _summary?: unknown;
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function normalizeAlerta(raw: RawAlerta, provider: "solis" | "sungrow") {
  const beginIso = raw.alarm_begin_time_iso ?? raw.inicio ?? "";
  const endIso = raw.alarm_end_time_iso ?? raw.fim ?? "";
  const beginBr = raw.alarm_begin_time_br ?? formatDateBR(beginIso);
  const endBr = raw.alarm_end_time_br ?? formatDateBR(endIso);

  let durationMinutes = raw.alarm_duration_minutes;
  if (durationMinutes === undefined && raw.duracao_ms) {
    durationMinutes = Math.round(raw.duracao_ms / 60000);
  }

  const inverterSn = raw.inverter_sn || raw.inverter_name || "";
  const isActive = raw.is_active !== undefined ? raw.is_active : !endIso;

  // ID único: combinar provider + station + alarm_code para evitar colisão
  const id = `${provider}-${raw.station_id ?? ""}-${raw.alarm_code ?? ""}-${beginIso}`;

  return {
    id,
    provider,
    station_id: String(raw.station_id ?? ""),
    station_name: String(raw.station_name ?? ""),
    inverter_sn: inverterSn,
    alarm_code: String(raw.alarm_code ?? ""),
    alarm_msg: String(raw.alarm_msg ?? ""),
    advice: String(raw.advice ?? ""),
    alarm_level: Number(raw.alarm_level ?? 1),
    alarm_level_label: raw.alarm_level_label ?? "tip",
    alarm_begin_time_iso: beginIso,
    alarm_begin_time_br: beginBr,
    alarm_end_time_iso: endIso || null,
    alarm_end_time_br: endBr,
    alarm_duration_minutes: durationMinutes ?? 0,
    state: Number(raw.state ?? 0),
    state_label: raw.state_label ?? "pending",
    is_active: isActive,
  };
}

async function fetchFromWebhook(url: string): Promise<RawAlerta[]> {
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;
  if (!user || !password) return [];

  const credentials = Buffer.from(`${user}:${password}`).toString("base64");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[cron-alertas] webhook ${url} retornou ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.filter((item: RawAlerta) => !item._summary);
  } catch (err) {
    console.error(`[cron-alertas] webhook ${url} erro:`, err instanceof Error ? err.message : err);
    return [];
  }
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("secret") !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getServiceClient();
  const results: Record<string, unknown> = {};

  const [solisRaw, sungrowRaw] = await Promise.all([
    fetchFromWebhook(WEBHOOK_SOLIS),
    fetchFromWebhook(WEBHOOK_SUNGROW),
  ]);

  // Solis
  if (solisRaw.length > 0) {
    const payload = solisRaw.map((a) => normalizeAlerta(a, "solis"));
    const { data, error } = await supabase.rpc("sync_alertas_cache", {
      p_provider: "solis",
      payload,
    });
    results.solis = error ? { error: error.message } : data;
  } else {
    // Sem alertas = limpar cache deste provider
    const { error } = await supabase
      .from("alertas_cache")
      .delete()
      .eq("provider", "solis");
    results.solis = error ? { error: error.message } : { cleared: true };
  }

  // SunGrow
  if (sungrowRaw.length > 0) {
    const payload = sungrowRaw.map((a) => normalizeAlerta(a, "sungrow"));
    const { data, error } = await supabase.rpc("sync_alertas_cache", {
      p_provider: "sungrow",
      payload,
    });
    results.sungrow = error ? { error: error.message } : data;
  } else {
    const { error } = await supabase
      .from("alertas_cache")
      .delete()
      .eq("provider", "sungrow");
    results.sungrow = error ? { error: error.message } : { cleared: true };
  }

  console.log("[cron-alertas] sync concluído:", results);
  return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() });
}

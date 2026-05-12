import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SOLIS = "https://n8n-n8n.nt4zcb.easypanel.host/webhook/sync-ucs-solis";
const WEBHOOK_SUNGROW = "https://n8n-n8n.nt4zcb.easypanel.host/webhook/sync-ucs-sungrow";
const CRON_SECRET = process.env.CRON_SECRET;

interface WebhookUC {
  station_id: string;
  station_name: string;
  cidade_uf?: string | null;
  potencia_instalada_kwp?: number;
  qtd_inversores?: number;
  modelo_inversores?: string[];
  potencia_inversor_kw?: number;
  data_instalacao_iso?: string | null;
  data_instalacao?: string | null;
  inversores_detalhe?: unknown[];
}

function normalizeUC(raw: WebhookUC, provider: "solis" | "sungrow") {
  return {
    station_id: raw.station_id,
    provider,
    station_name: raw.station_name,
    cidade_uf: raw.cidade_uf ?? null,
    potencia_instalada_kwp: raw.potencia_instalada_kwp ?? 0,
    qtd_inversores: raw.qtd_inversores ?? 0,
    modelo_inversores: raw.modelo_inversores ?? [],
    potencia_inversor_kw: raw.potencia_inversor_kw ?? 0,
    data_instalacao: raw.data_instalacao_iso ?? raw.data_instalacao ?? null,
    inversores_detalhe: raw.inversores_detalhe ?? [],
  };
}

async function fetchFromWebhook(url: string): Promise<WebhookUC[]> {
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;
  if (!user || !password) return [];

  const credentials = Buffer.from(`${user}:${password}`).toString("base64");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout

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
      console.error(`[cron-usinas] webhook ${url} retornou ${res.status}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[cron-usinas] webhook ${url} erro:`, err instanceof Error ? err.message : err);
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
  // Proteger endpoint com secret
  if (CRON_SECRET) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("secret") !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getServiceClient();
  const results: Record<string, unknown> = {};

  // Buscar Solis e SunGrow em paralelo
  const [solisRaw, sungrowRaw] = await Promise.all([
    fetchFromWebhook(WEBHOOK_SOLIS),
    fetchFromWebhook(WEBHOOK_SUNGROW),
  ]);

  // Processar Solis
  if (solisRaw.length > 0) {
    const payload = solisRaw.map((uc) => normalizeUC(uc, "solis"));
    const { data, error } = await supabase.rpc("sync_usinas_cache", {
      payload,
    });
    results.solis = error ? { error: error.message } : data;
  } else {
    results.solis = { skipped: true, reason: "webhook vazio ou erro" };
  }

  // Processar SunGrow
  if (sungrowRaw.length > 0) {
    const payload = sungrowRaw.map((uc) => normalizeUC(uc, "sungrow"));
    const { data, error } = await supabase.rpc("sync_usinas_cache", {
      payload,
    });
    results.sungrow = error ? { error: error.message } : data;
  } else {
    results.sungrow = { skipped: true, reason: "webhook vazio ou erro" };
  }

  console.log("[cron-usinas] sync concluído:", results);
  return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() });
}

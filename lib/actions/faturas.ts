"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

const WEBHOOK_FATURA_URL =
  "https://n8n-n8n.nt4zcb.easypanel.host/webhook/1f12ba76-a38d-4a8f-9441-db04f017c72f";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

async function enviarWebhookFatura(payload: {
  fatura_id: string;
  uc_id: string;
  mes_referencia: string;
  arquivo_url: string | null;
  role: "admin" | "cliente";
  user_id: string;
}) {
  try {
    const res = await fetch(WEBHOOK_FATURA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[webhook fatura]", res.status, await res.text());
  } catch (err) {
    console.error("[webhook fatura] erro:", err);
  }
}

function parseDecimal(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function str(value: string | null): string | null {
  return value || null;
}

export async function createFatura(formData: FormData): Promise<ActionResult> {
  console.log("[createFatura] CHAMADA RECEBIDA");
  console.log("[createFatura] pdf_url:", formData.get("pdf_url"));
  console.log("[createFatura] imagem_url:", formData.get("imagem_url"));
  const supabase = await createServerClient();

  const uc_id = formData.get("uc_id") as string;
  const mes_referencia = formData.get("mes_referencia") as string;

  if (!uc_id || !mes_referencia) {
    console.log("[createFatura] ERRO: campos obrigatórios ausentes");
    return { error: "UC e mês de referência são obrigatórios." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("faturas")
    .insert({
      uc_id,
      mes_referencia,
      denominacao: str(formData.get("denominacao") as string),
      contrato: str(formData.get("contrato") as string),
      valor_faturado: parseDecimal(formData.get("valor_faturado") as string),
      inicio_ciclo: str(formData.get("inicio_ciclo") as string),
      fim_ciclo: str(formData.get("fim_ciclo") as string),
      energia_faturada_fp: parseDecimal(formData.get("energia_faturada_fp") as string),
      valor_tarifa_fp: parseDecimal(formData.get("valor_tarifa_fp") as string),
      kwh_compensado_fp: parseDecimal(formData.get("kwh_compensado_fp") as string),
      tarifa_compensada_fp: parseDecimal(formData.get("tarifa_compensada_fp") as string),
      energia_consumida_fp: parseDecimal(formData.get("energia_consumida_fp") as string),
      energia_injetada_fp: parseDecimal(formData.get("energia_injetada_fp") as string),
      valor_total: parseDecimal(formData.get("valor_total") as string),
      consumo_kwh: parseDecimal(formData.get("consumo_kwh") as string),
      energia_injetada_kwh: parseDecimal(formData.get("energia_injetada_kwh") as string),
      creditos_energia_kwh: parseDecimal(formData.get("creditos_energia_kwh") as string),
      demanda_contratada_kw: parseDecimal(formData.get("demanda_contratada_kw") as string),
      valor_tusd: parseDecimal(formData.get("valor_tusd") as string),
      valor_te: parseDecimal(formData.get("valor_te") as string),
      economia_estimada: parseDecimal(formData.get("economia_estimada") as string),
      pdf_url: str(formData.get("pdf_url") as string),
      status: "processada",
      inserido_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.log("[createFatura] ERRO insert:", error.code, error.message);
    if (error.code === "23505") {
      return { error: "Já existe fatura para esta UC neste mês de referência." };
    }
    return { error: "Erro ao criar fatura." };
  }
  console.log("[createFatura] INSERT OK, id:", data.id);

  const arquivoUrl = str(formData.get("pdf_url") as string) ?? str(formData.get("imagem_url") as string) ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  await enviarWebhookFatura({
    fatura_id: data.id,
    uc_id,
    mes_referencia,
    arquivo_url: arquivoUrl,
    role: (profile?.role as "admin" | "cliente") ?? "admin",
    user_id: user?.id ?? "",
  });

  revalidatePath("/admin/faturas");
  return { data: { id: data.id } };
}

export async function updateFatura(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("faturas")
    .update({
      denominacao: str(formData.get("denominacao") as string),
      contrato: str(formData.get("contrato") as string),
      valor_faturado: parseDecimal(formData.get("valor_faturado") as string),
      inicio_ciclo: str(formData.get("inicio_ciclo") as string),
      fim_ciclo: str(formData.get("fim_ciclo") as string),
      energia_faturada_fp: parseDecimal(formData.get("energia_faturada_fp") as string),
      valor_tarifa_fp: parseDecimal(formData.get("valor_tarifa_fp") as string),
      kwh_compensado_fp: parseDecimal(formData.get("kwh_compensado_fp") as string),
      tarifa_compensada_fp: parseDecimal(formData.get("tarifa_compensada_fp") as string),
      energia_consumida_fp: parseDecimal(formData.get("energia_consumida_fp") as string),
      energia_injetada_fp: parseDecimal(formData.get("energia_injetada_fp") as string),
      valor_total: parseDecimal(formData.get("valor_total") as string),
      consumo_kwh: parseDecimal(formData.get("consumo_kwh") as string),
      energia_injetada_kwh: parseDecimal(formData.get("energia_injetada_kwh") as string),
      creditos_energia_kwh: parseDecimal(formData.get("creditos_energia_kwh") as string),
      demanda_contratada_kw: parseDecimal(formData.get("demanda_contratada_kw") as string),
      valor_tusd: parseDecimal(formData.get("valor_tusd") as string),
      valor_te: parseDecimal(formData.get("valor_te") as string),
      economia_estimada: parseDecimal(formData.get("economia_estimada") as string),
      pdf_url: str(formData.get("pdf_url") as string),
    })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao atualizar fatura." };
  }

  revalidatePath("/admin/faturas");
  return {};
}

export async function getFaturas(search?: string, status?: string, empresaId?: string) {
  const supabase = await createServerClient();

  let query = supabase
    .from("faturas")
    .select("id, uc_id, mes_referencia, denominacao, contrato, valor_faturado, energia_faturada_fp, energia_consumida_fp, valor_total, consumo_kwh, economia_estimada, status, pdf_url, created_at, uc:unidades_consumidoras(id, codigo_uc, empresa:empresas(id, nome))")
    .order("mes_referencia", { ascending: false });

  if (status && status !== "todas") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) return [];

  type RawRow = (typeof data)[number];
  const normalized = data.map((row: RawRow) => {
    const ucRaw = row.uc as unknown;
    const uc = Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw;
    if (uc) {
      const empresaRaw = (uc as Record<string, unknown>).empresa;
      (uc as Record<string, unknown>).empresa = Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw;
    }
    return { ...row, uc } as {
      id: string; uc_id: string; mes_referencia: string; denominacao: string | null;
      contrato: string | null; valor_faturado: number | null; energia_faturada_fp: number | null;
      energia_consumida_fp: number | null; valor_total: number | null;
      consumo_kwh: number | null; economia_estimada: number | null; status: string;
      pdf_url: string | null; created_at: string;
      uc: { id: string; codigo_uc: string; empresa: { id: string; nome: string } | null } | null;
    };
  });

  let result = normalized;

  if (search) {
    const s = search.toLowerCase();
    result = result.filter((f) =>
      f.uc?.codigo_uc?.toLowerCase().includes(s) ||
      f.uc?.empresa?.nome?.toLowerCase().includes(s) ||
      f.denominacao?.toLowerCase().includes(s) ||
      f.contrato?.toLowerCase().includes(s)
    );
  }

  if (empresaId) {
    result = result.filter((f) => f.uc?.empresa?.id === empresaId);
  }

  return result;
}

export async function getFatura(id: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("faturas")
    .select("*, uc:unidades_consumidoras(id, codigo_uc, titular, distribuidora, empresa:empresas(id, nome))")
    .eq("id", id)
    .single();

  if (error) return null;

  // Normalizar
  const ucRaw = data.uc as unknown;
  const uc = Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw;
  if (uc) {
    const empresaRaw = (uc as Record<string, unknown>).empresa;
    (uc as Record<string, unknown>).empresa = Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw;
  }
  return { ...data, uc };
}

export async function getFaturasCliente(empresaIds: string | string[]) {
  const supabase = await createServerClient();
  const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

  const { data, error } = await supabase
    .from("faturas")
    .select("id, uc_id, mes_referencia, valor_faturado, valor_total, consumo_kwh, status, pdf_url, imagem_url, uc:unidades_consumidoras!inner(id, codigo_uc, empresa_id)")
    .in("uc.empresa_id", ids)
    .order("mes_referencia", { ascending: false });

  if (error) return [];

  return data.map((row) => {
    const ucRaw = row.uc as unknown;
    const uc = Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw;
    return { ...row, uc } as {
      id: string; uc_id: string; mes_referencia: string; valor_faturado: number | null;
      valor_total: number | null; consumo_kwh: number | null; status: string;
      pdf_url: string | null; imagem_url: string | null;
      uc: { id: string; codigo_uc: string } | null;
    };
  });
}

export async function createFaturaCliente(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();

  const uc_id = formData.get("uc_id") as string;
  const mes_referencia = formData.get("mes_referencia") as string;
  const imagem_url = formData.get("imagem_url") as string;
  const pdf_url = formData.get("pdf_url") as string;

  if (!uc_id || !mes_referencia) {
    return { error: "UC e mês de referência são obrigatórios." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("faturas")
    .insert({
      uc_id,
      mes_referencia,
      imagem_url: imagem_url || null,
      pdf_url: pdf_url || null,
      status: "pendente",
      inserido_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe fatura para esta UC neste mês." };
    }
    return { error: "Erro ao enviar fatura." };
  }

  const arquivoUrl = imagem_url || pdf_url || null;

  await enviarWebhookFatura({
    fatura_id: data.id,
    uc_id,
    mes_referencia,
    arquivo_url: arquivoUrl,
    role: "cliente",
    user_id: user?.id ?? "",
  });

  revalidatePath("/cliente/fatura");
  return { data: { id: data.id } };
}

// ——— Criação de fatura com dados de geração (admin) ———

export async function createFaturaComGeracao(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();

  const uc_id = formData.get("uc_id") as string;
  const mes_referencia = formData.get("mes_referencia") as string;

  if (!uc_id || !mes_referencia) {
    return { error: "UC e mês de referência são obrigatórios." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("faturas")
    .insert({
      uc_id,
      mes_referencia,
      pdf_url: str(formData.get("pdf_url") as string),
      imagem_url: str(formData.get("imagem_url") as string),
      status: "pendente",
      inserido_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe fatura para esta UC neste mês de referência." };
    }
    return { error: "Erro ao criar fatura." };
  }

  // Enviar webhook com dados de geração incluídos
  const arquivoUrl = str(formData.get("pdf_url") as string) ?? str(formData.get("imagem_url") as string) ?? null;
  const dadosGeracaoRaw = formData.get("dados_geracao") as string;
  const stationId = formData.get("station_id") as string;

  let dadosGeracao = null;
  if (dadosGeracaoRaw) {
    try {
      dadosGeracao = JSON.parse(dadosGeracaoRaw);
    } catch {
      // ignora parse error
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  try {
    const res = await fetch(WEBHOOK_FATURA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fatura_id: data.id,
        uc_id,
        mes_referencia,
        arquivo_url: arquivoUrl,
        station_id: stationId || null,
        role: (profile?.role as "admin" | "cliente") ?? "admin",
        user_id: user?.id ?? "",
        dados_geracao: dadosGeracao,
      }),
    });
    console.log("[webhook fatura+geracao]", res.status);
  } catch (err) {
    console.error("[webhook fatura+geracao] erro:", err);
  }

  revalidatePath("/admin/faturas");
  return { data: { id: data.id } };
}

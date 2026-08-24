"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { criarNotificacao } from "@/lib/actions/notificacoes";

const WEBHOOK_FATURA_URL =
  process.env.N8N_WEBHOOK_FATURA_URL ??
  "https://n8n-n8n.nt4zcb.easypanel.host/webhook/1f12ba76-a38d-4a8f-9441-db04f017c72f";

/**
 * Detecta e corrige duplicação de energia injetada.
 * Quando energia_injetada_fp === energia_injetada_kwh, significa que a fatura
 * mostrou a mesma energia em duas linhas (TUSD e TE), mas é a MESMA energia.
 * Neste caso, mantemos apenas energia_injetada_kwh e zeramos energia_injetada_fp.
 */
function corrigirDuplicacaoEnergiaInjetada(data: {
  energia_injetada_fp?: number | null;
  energia_injetada_kwh?: number | null;
}): {
  energia_injetada_fp: number | null;
  energia_injetada_kwh: number | null;
} {
  const fp = data.energia_injetada_fp ?? null;
  const kwh = data.energia_injetada_kwh ?? null;

  // Se ambos são nulos ou zero, manter assim
  if ((!fp || fp === 0) && (!kwh || kwh === 0)) {
    return { energia_injetada_fp: null, energia_injetada_kwh: null };
  }

  // Se apenas um está preenchido, manter assim
  if (!fp || fp === 0) {
    return { energia_injetada_fp: null, energia_injetada_kwh: kwh };
  }
  if (!kwh || kwh === 0) {
    return { energia_injetada_fp: fp, energia_injetada_kwh: null };
  }

  // Se os valores são IGUAIS (duplicação), manter apenas no campo total (kwh)
  if (Math.abs(fp - kwh) < 0.01) { // Tolerância de 0.01 kWh para floating point
    return { energia_injetada_fp: null, energia_injetada_kwh: kwh };
  }

  // Se são valores diferentes, mantém ambos (injeção em ponta + fora ponta)
  return { energia_injetada_fp: fp, energia_injetada_kwh: kwh };
}

/** Agenda callback para rodar após a resposta. Fallback fire-and-forget em ambientes sem request scope (ex: testes). */
function afterResponse(callback: () => Promise<void>) {
  try {
    after(callback);
  } catch {
    // Fire-and-forget fallback - silencia erros
    callback().catch(() => {});
  }
}

interface ActionResult {
  error?: string;
  data?: { id: string; uc_id?: string; mes_referencia?: string };
}

export async function enviarWebhookFatura(payload: {
  fatura_id: string;
  uc_id: string;
  mes_referencia: string;
  arquivo_url: string | null;
  role: "admin" | "cliente";
  user_id: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(WEBHOOK_FATURA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    clearTimeout(timeout);
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
  const supabase = await createServerClient();

  const uc_id = formData.get("uc_id") as string;
  const mes_referencia = formData.get("mes_referencia") as string;

  if (!uc_id || !mes_referencia) {
    return { error: "UC e mês de referência são obrigatórios." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Corrigir duplicação de energia injetada (TUSD + TE mostrando mesmo valor)
  const energiaInjetadaCorrigida = corrigirDuplicacaoEnergiaInjetada({
    energia_injetada_fp: parseDecimal(formData.get("energia_injetada_fp") as string),
    energia_injetada_kwh: parseDecimal(formData.get("energia_injetada_kwh") as string),
  });

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
      energia_injetada_fp: energiaInjetadaCorrigida.energia_injetada_fp,
      valor_total: parseDecimal(formData.get("valor_total") as string),
      consumo_kwh: parseDecimal(formData.get("consumo_kwh") as string),
      energia_injetada_kwh: energiaInjetadaCorrigida.energia_injetada_kwh,
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
    if (error.code === "23505") {
      return { error: "Já existe fatura para esta UC neste mês de referência. Para substituí-la, exclua a fatura existente primeiro." };
    }
    return { error: "Erro ao criar fatura." };
  }

  const arquivoUrl = str(formData.get("pdf_url") as string) ?? str(formData.get("imagem_url") as string) ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const webhookPayload = {
    fatura_id: data.id,
    uc_id,
    mes_referencia,
    arquivo_url: arquivoUrl,
    role: (profile?.role as "admin" | "cliente") ?? "admin",
    user_id: user?.id ?? "",
  };

  afterResponse(async () => {
    await enviarWebhookFatura(webhookPayload);
  });

  revalidatePath("/admin/faturas");
  return { data: { id: data.id } };
}

const FATURA_EDITABLE_FIELDS = [
  "denominacao",
  "contrato",
  "inicio_ciclo",
  "fim_ciclo",
  "energia_faturada_fp",
  "valor_tarifa_fp",
  "tarifa_compensada_fp",
  "energia_consumida_fp",
  "energia_injetada_fp",
  "valor_total",
  "consumo_kwh",
  "energia_injetada_kwh",
  "creditos_energia_kwh",
  "demanda_contratada_kw",
  "valor_tusd",
  "valor_te",
] as const;

type FaturaEditableField = (typeof FATURA_EDITABLE_FIELDS)[number];

export async function updateFatura(
  id: string,
  updates: Partial<Record<FaturaEditableField, string | number | null>>
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Fetch current values to generate diff
  const { data: current, error: fetchError } = await supabase
    .from("faturas")
    .select(FATURA_EDITABLE_FIELDS.join(", "))
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { error: "Fatura não encontrada." };
  }

  // Build diff entries
  const logEntries: {
    fatura_id: string;
    campo_alterado: string;
    valor_anterior: string | null;
    valor_novo: string | null;
    alterado_por: string;
  }[] = [];

  let updatePayload: Record<string, unknown> = {};

  for (const field of FATURA_EDITABLE_FIELDS) {
    if (!(field in updates)) continue;

    const newValue = updates[field];
    const currentValue = (current as unknown as Record<string, unknown>)[field];

    const currentStr = currentValue == null ? null : String(currentValue);
    const newStr = newValue == null ? null : String(newValue);

    if (currentStr !== newStr) {
      logEntries.push({
        fatura_id: id,
        campo_alterado: field,
        valor_anterior: currentStr,
        valor_novo: newStr,
        alterado_por: user.id,
      });
      updatePayload[field] = newValue;
    }
  }

  // Corrigir duplicação de energia injetada se ambos os campos foram atualizados
  if ("energia_injetada_fp" in updatePayload || "energia_injetada_kwh" in updatePayload) {
    const currentRecord = current as unknown as Record<string, unknown>;
    const energiaInjetadaCorrigida = corrigirDuplicacaoEnergiaInjetada({
      energia_injetada_fp: (updatePayload.energia_injetada_fp ?? currentRecord.energia_injetada_fp) as number | null,
      energia_injetada_kwh: (updatePayload.energia_injetada_kwh ?? currentRecord.energia_injetada_kwh) as number | null,
    });

    updatePayload.energia_injetada_fp = energiaInjetadaCorrigida.energia_injetada_fp;
    updatePayload.energia_injetada_kwh = energiaInjetadaCorrigida.energia_injetada_kwh;
  }

  if (Object.keys(updatePayload).length === 0) {
    return { error: "Nenhuma alteração detectada." };
  }

  const { error: updateError } = await supabase
    .from("faturas")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return { error: "Erro ao atualizar fatura." };
  }

  // Insert log entries
  if (logEntries.length > 0) {
    const { error: logError } = await supabase
      .from("faturas_log")
      .insert(logEntries);

    if (logError) {
      // Log error silenciado em producao — faturas_log e best-effort
    }
  }

  revalidatePath(`/admin/faturas/${id}`);
  revalidatePath("/admin/faturas");
  return { data: { id } };
}

export async function deleteFatura(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Primeiro, desvincular relatórios que referenciam esta fatura
  const { error: unlinkError } = await supabase
    .from("relatorios")
    .update({ fatura_id: null })
    .eq("fatura_id", id);

  if (unlinkError) {
    return { error: "Erro ao desvincular relatórios da fatura." };
  }

  // Depois, deletar a fatura
  const { error } = await supabase
    .from("faturas")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Erro ao excluir fatura." };
  }

  revalidatePath("/admin/faturas");
  revalidatePath("/admin/relatorios");
  return { data: { id } };
}

export async function getFaturaLog(faturaId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("faturas_log")
    .select("id, campo_alterado, valor_anterior, valor_novo, alterado_em, admin:profiles(id, nome)")
    .eq("fatura_id", faturaId)
    .order("alterado_em", { ascending: false });

  if (error) return [];

  return data.map((row) => {
    const adminRaw = row.admin as unknown;
    const admin = Array.isArray(adminRaw) ? adminRaw[0] ?? null : adminRaw;
    return { ...row, admin } as {
      id: string;
      campo_alterado: string;
      valor_anterior: string | null;
      valor_novo: string | null;
      alterado_em: string;
      admin: { id: string; nome: string } | null;
    };
  });
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

  query = query.limit(500);

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

  // Buscar código da UC para a notificação
  const { data: ucData } = await supabase
    .from("unidades_consumidoras")
    .select("codigo_uc")
    .eq("id", uc_id)
    .single();

  // Criar notificação para admins
  await criarNotificacao(
    "fatura_cliente",
    `Nova fatura enviada pelo cliente - UC ${ucData?.codigo_uc ?? uc_id}`,
    data.id
  );

  const webhookPayload = {
    fatura_id: data.id,
    uc_id,
    mes_referencia,
    arquivo_url: arquivoUrl,
    role: "cliente" as const,
    user_id: user?.id ?? "",
  };

  afterResponse(async () => {
    await enviarWebhookFatura(webhookPayload);
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
      return { error: "Já existe fatura para esta UC neste mês de referência. Para substituí-la, exclua a fatura existente primeiro." };
    }
    return { error: "Erro ao criar fatura." };
  }

  // Coletar dados do webhook antes de retornar
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

  // Calcular geração estimada e adicionar aos dados de geração
  if (dadosGeracao?.totais?.geracao_kwh) {
    const { calcularGeracaoEstimadaUC } = await import("@/lib/actions/geracao-estimada");
    const resultado = await calcularGeracaoEstimadaUC(
      uc_id,
      mes_referencia,
      dadosGeracao.totais.geracao_kwh
    );

    if ("data" in resultado && resultado.data) {
      // Adicionar geracao_estimada_kwh dentro de totais
      dadosGeracao.totais.geracao_estimada_kwh = resultado.data.geracao_estimada_kwh;
    }
  }

  const webhookPayload = {
    fatura_id: data.id,
    uc_id,
    mes_referencia,
    arquivo_url: arquivoUrl,
    station_id: stationId || null,
    role: (profile?.role as "admin" | "cliente") ?? "admin",
    user_id: user?.id ?? "",
    dados_geracao: dadosGeracao,
  };

  // Enviar webhook de fatura após a resposta (o n8n faz extração + geração do relatório)
  afterResponse(async () => {
    const controller = new AbortController();
    const webhookTimeout = setTimeout(() => controller.abort(), 15000);

    try {
      await fetch(WEBHOOK_FATURA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });
      clearTimeout(webhookTimeout);
    } catch {
      clearTimeout(webhookTimeout);
    }
  });

  revalidatePath("/admin/faturas");
  revalidatePath("/admin/relatorios");
  return { data: { id: data.id, uc_id, mes_referencia } };
}

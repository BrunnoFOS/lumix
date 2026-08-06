"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface ValidationError {
  field: string;
  message: string;
}

interface ActionResult {
  error?: string;
  validationErrors?: ValidationError[];
  data?: Record<string, unknown>;
}

const EDITABLE_FIELDS = [
  "consumo_total_kwh",
  "consumo_ponta_kwh",
  "consumo_fora_ponta_kwh",
  "energia_injetada_kwh",
  "consumo_injetado_mesma_uc_kwh",
  "consumo_injetado_outra_uc_kwh",
  "credito_acumulado_kwh",
  "valor_total_fatura_rs",
  "vto_ci_rs",
  "tem_geracao_compartilhada",
  "evidencia_geracao_compartilhada",
  "data_vencimento",
  "numero_fatura",
  "observacao",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function getFaturaProcessada(id: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("faturas_processadas")
    .select("*, uc:unidades_consumidoras(id, codigo_uc, titular, empresa:empresas(id, nome))")
    .eq("id", id)
    .single();

  if (error) return null;

  const ucRaw = data.uc as unknown;
  const uc = Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw;
  if (uc) {
    const empresaRaw = (uc as Record<string, unknown>).empresa;
    (uc as Record<string, unknown>).empresa = Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw;
  }
  return { ...data, uc };
}

export async function getFaturaProcessadaLog(fpId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("faturas_processadas_log")
    .select("id, campo_alterado, valor_anterior, valor_novo, alterado_em, admin:profiles(id, nome)")
    .eq("faturas_processadas_id", fpId)
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

export async function getFaturasProcessadasByUc(ucId: string, mesReferencia: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("faturas_processadas")
    .select("id, status, mes_referencia")
    .eq("uc_id", ucId)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();

  if (error) return null;
  return data;
}

const NUMERIC_FIELDS = [
  "consumo_total_kwh",
  "consumo_ponta_kwh",
  "consumo_fora_ponta_kwh",
  "energia_injetada_kwh",
  "consumo_injetado_mesma_uc_kwh",
  "consumo_injetado_outra_uc_kwh",
  "credito_acumulado_kwh",
  "valor_total_fatura_rs",
  "vto_ci_rs",
] as const;

function validateFields(
  updates: Partial<Record<EditableField, string | number | boolean | null>>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of NUMERIC_FIELDS) {
    if (!(field in updates)) continue;
    const value = updates[field];
    if (value == null) continue;
    const num = typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(num)) {
      errors.push({ field, message: "Valor numérico inválido." });
    } else if (num < 0) {
      errors.push({ field, message: "Valor não pode ser negativo." });
    }
  }

  if ("valor_total_fatura_rs" in updates) {
    const v = updates.valor_total_fatura_rs;
    if (v != null) {
      const num = typeof v === "number" ? v : parseFloat(String(v));
      if (!isNaN(num) && num === 0) {
        errors.push({ field: "valor_total_fatura_rs", message: "Valor total deve ser maior que zero." });
      }
    }
  }

  if ("data_vencimento" in updates) {
    const v = updates.data_vencimento;
    if (v != null && typeof v === "string" && v !== "") {
      const d = new Date(v + "T00:00:00");
      if (isNaN(d.getTime())) {
        errors.push({ field: "data_vencimento", message: "Data inválida." });
      }
    }
  }

  return errors;
}

export async function updateFaturaProcessada(
  id: string,
  updates: Partial<Record<EditableField, string | number | boolean | null>>
): Promise<ActionResult> {
  const validationErrors = validateFields(updates);
  if (validationErrors.length > 0) {
    return { validationErrors };
  }

  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Fetch current values to generate diff
  const { data: current, error: fetchError } = await supabase
    .from("faturas_processadas")
    .select(EDITABLE_FIELDS.join(", "))
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { error: "Fatura processada não encontrada." };
  }

  // Build diff entries
  const logEntries: {
    faturas_processadas_id: string;
    campo_alterado: string;
    valor_anterior: string | null;
    valor_novo: string | null;
    alterado_por: string;
  }[] = [];

  const updatePayload: Record<string, unknown> = {};

  for (const field of EDITABLE_FIELDS) {
    if (!(field in updates)) continue;

    const newValue = updates[field];
    const currentValue = (current as unknown as Record<string, unknown>)[field];

    // Normalize for comparison
    const currentStr = currentValue == null ? null : String(currentValue);
    const newStr = newValue == null ? null : String(newValue);

    if (currentStr !== newStr) {
      logEntries.push({
        faturas_processadas_id: id,
        campo_alterado: field,
        valor_anterior: currentStr,
        valor_novo: newStr,
        alterado_por: user.id,
      });
      updatePayload[field] = newValue;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return { error: "Nenhuma alteração detectada." };
  }

  // Update the record
  updatePayload.editado_por = user.id;
  updatePayload.ultima_edicao_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("faturas_processadas")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return { error: "Erro ao atualizar fatura processada." };
  }

  // Insert log entries
  if (logEntries.length > 0) {
    const { error: logError } = await supabase
      .from("faturas_processadas_log")
      .insert(logEntries);

    if (logError) {
      console.error("[updateFaturaProcessada] Erro ao inserir log:", logError);
    }
  }

  revalidatePath(`/admin/faturas-processadas/${id}`);
  return { data: { updated: Object.keys(updatePayload).length } };
}

const REGENERABLE_STATUSES = ["extraido", "gerado", "erro"];

export async function regenerarRelatorioPDF(fpId: string): Promise<ActionResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_FATURA_PROCESSADA;
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;

  if (!webhookUrl) {
    return { error: "Webhook de regeneração de relatório não configurado. Defina N8N_WEBHOOK_FATURA_PROCESSADA." };
  }

  const supabase = await createServerClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { error: "Não autenticado." };

  const { data: fp, error: fetchError } = await supabase
    .from("faturas_processadas")
    .select("*, uc:unidades_consumidoras(id, codigo_uc, titular, distribuidora, subgrupo, modalidade_tarifaria, enquadramento_tarifario, potencia_instalada_kwp, empresa:empresas(id, nome))")
    .eq("id", fpId)
    .single();

  if (fetchError || !fp) {
    return { error: "Fatura processada não encontrada." };
  }

  if (!REGENERABLE_STATUSES.includes(fp.status)) {
    return { error: `Não é possível regerar relatório com status "${fp.status}".` };
  }

  // Update status to 'gerando'
  const { error: statusError } = await supabase
    .from("faturas_processadas")
    .update({ status: "gerando" })
    .eq("id", fpId);

  if (statusError) {
    return { error: "Erro ao atualizar status." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (user && password) {
      const credentials = Buffer.from(`${user}:${password}`).toString("base64");
      headers.Authorization = `Basic ${credentials}`;
    }

    const ucRaw = fp.uc as unknown;
    const uc = Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw;

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        faturas_processadas_id: fpId,
        uc_id: fp.uc_id,
        mes_referencia: fp.mes_referencia,
        consumo_total_kwh: fp.consumo_total_kwh,
        consumo_ponta_kwh: fp.consumo_ponta_kwh,
        consumo_fora_ponta_kwh: fp.consumo_fora_ponta_kwh,
        energia_injetada_kwh: fp.energia_injetada_kwh,
        consumo_injetado_mesma_uc_kwh: fp.consumo_injetado_mesma_uc_kwh,
        consumo_injetado_outra_uc_kwh: fp.consumo_injetado_outra_uc_kwh,
        credito_acumulado_kwh: fp.credito_acumulado_kwh,
        valor_total_fatura_rs: fp.valor_total_fatura_rs,
        vto_ci_rs: fp.vto_ci_rs,
        tem_geracao_compartilhada: fp.tem_geracao_compartilhada,
        evidencia_geracao_compartilhada: fp.evidencia_geracao_compartilhada,
        data_vencimento: fp.data_vencimento,
        numero_fatura: fp.numero_fatura,
        observacao: fp.observacao,
        uc_info: uc,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Revert status on failure
      await supabase
        .from("faturas_processadas")
        .update({ status: "erro" })
        .eq("id", fpId);

      return { error: `Erro ao regerar relatório (${res.status}).` };
    }

    revalidatePath(`/admin/faturas-processadas/${fpId}`);
    return { data: { status: "gerando" } };
  } catch (err) {
    clearTimeout(timeout);

    // Revert status on error
    await supabase
      .from("faturas_processadas")
      .update({ status: "erro" })
      .eq("id", fpId);

    return { error: `Erro de conexão ao regerar relatório: ${err instanceof Error ? err.message : String(err)}` };
  }
}

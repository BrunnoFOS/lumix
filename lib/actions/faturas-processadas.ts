"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface ActionResult {
  error?: string;
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

export async function updateFaturaProcessada(
  id: string,
  updates: Partial<Record<EditableField, string | number | boolean | null>>
): Promise<ActionResult> {
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

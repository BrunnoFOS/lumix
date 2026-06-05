"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

const N8N_WEBHOOK_REGERAR_FATURA =
  "https://n8n-n8n.nt4zcb.easypanel.host/webhook/1f12ba76-a38d-4a8f-9441-db04f017c72f";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

export async function getFaturasProcessadas(ucId?: string, search?: string) {
  const supabase = await createServerClient();

  let query = supabase
    .from("faturas_processadas")
    .select(
      "id, uc_id, mes_referencia, status, pdf_relatorio_url, observacao, ultima_edicao_at, numero_fatura, valor_total_fatura_rs, consumo_total_kwh, uc:unidades_consumidoras(id, codigo_uc, empresa:empresas(id, nome))"
    )
    .order("mes_referencia", { ascending: false });

  if (ucId) {
    query = query.eq("uc_id", ucId);
  }

  const { data, error } = await query;
  if (error) return [];

  const normalized = data.map((row) => {
    const ucRaw = row.uc as unknown;
    const uc = (Array.isArray(ucRaw) ? ucRaw[0] ?? null : ucRaw) as {
      id: string;
      codigo_uc: string;
      empresa: { id: string; nome: string } | { id: string; nome: string }[] | null;
    } | null;

    let empresaNome = "";
    if (uc?.empresa) {
      const emp = Array.isArray(uc.empresa) ? uc.empresa[0] : uc.empresa;
      empresaNome = emp?.nome ?? "";
    }

    return {
      ...row,
      uc: uc ? { id: uc.id, codigo_uc: uc.codigo_uc } : null,
      empresa_nome: empresaNome,
    };
  });

  if (search) {
    const s = search.toLowerCase();
    return normalized.filter(
      (r) =>
        r.uc?.codigo_uc?.toLowerCase().includes(s) ||
        r.empresa_nome.toLowerCase().includes(s) ||
        r.numero_fatura?.toLowerCase().includes(s)
    );
  }

  return normalized;
}

export async function getFaturaProcessada(id: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("faturas_processadas")
    .select("*, uc:unidades_consumidoras(id, codigo_uc, grupo_tarifario, empresa:empresas(id, nome))")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export interface CamposEditaveis {
  consumo_total_kwh?: number | null;
  consumo_ponta_kwh?: number | null;
  consumo_fora_ponta_kwh?: number | null;
  energia_injetada_kwh?: number | null;
  consumo_injetado_mesma_uc_kwh?: number | null;
  consumo_injetado_outra_uc_kwh?: number | null;
  credito_acumulado_kwh?: number | null;
  valor_total_fatura_rs?: number | null;
  vto_ci_rs?: number | null;
  tem_geracao_compartilhada?: boolean;
  numero_fatura?: string | null;
  data_vencimento?: string | null;
  observacao?: string | null;
}

export async function updateFaturaProcessada(
  id: string,
  campos: CamposEditaveis
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("faturas_processadas")
    .update(campos)
    .eq("id", id);

  if (error) {
    return { error: "Erro ao atualizar fatura processada." };
  }

  revalidatePath("/admin/faturas-processadas");
  return {};
}

export async function regerarRelatorioFatura(
  faturaId: string,
  camposEditados: CamposEditaveis,
  adminId: string
): Promise<{ error?: string; success?: boolean; pdf_url?: string }> {
  const supabase = await createServerClient();

  if (!N8N_WEBHOOK_REGERAR_FATURA) {
    return { error: "URL do webhook de regeração não configurada." };
  }

  // Atualizar campos editados e status para "gerando"
  const { error: updateErr } = await supabase
    .from("faturas_processadas")
    .update({
      ...camposEditados,
      status: "gerando",
      ultima_edicao_at: new Date().toISOString(),
      editado_por: adminId,
    })
    .eq("id", faturaId);

  if (updateErr) {
    return { error: "Erro ao atualizar campos da fatura." };
  }

  // Chamar webhook n8n
  const user = process.env.N8N_API_USER;
  const password = process.env.N8N_API_PASSWORD;

  if (!user || !password) {
    // Reverter status
    await supabase
      .from("faturas_processadas")
      .update({ status: "extraido" })
      .eq("id", faturaId);
    return { error: "Variáveis de ambiente N8N não configuradas." };
  }

  try {
    const credentials = Buffer.from(`${user}:${password}`).toString("base64");

    const res = await fetch(N8N_WEBHOOK_REGERAR_FATURA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        fatura_id: faturaId,
        campos_editados: camposEditados,
        admin_id: adminId,
      }),
    });

    if (!res.ok) {
      // Reverter status
      await supabase
        .from("faturas_processadas")
        .update({ status: "erro" })
        .eq("id", faturaId);
      return { error: `Erro ao regerar relatório (${res.status}).` };
    }

    const result = await res.json();

    if (result.status === "ok" && result.pdf_url) {
      // Atualizar com URL do novo PDF
      await supabase
        .from("faturas_processadas")
        .update({
          pdf_relatorio_url: result.pdf_url,
          status: "gerado",
        })
        .eq("id", faturaId);

      revalidatePath("/admin/faturas-processadas");
      return { success: true, pdf_url: result.pdf_url };
    }

    await supabase
      .from("faturas_processadas")
      .update({ status: "erro" })
      .eq("id", faturaId);
    return { error: result.mensagem || "Erro desconhecido ao regerar relatório." };
  } catch (err) {
    await supabase
      .from("faturas_processadas")
      .update({ status: "erro" })
      .eq("id", faturaId);
    return {
      error: `Erro de conexão: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

export async function criarNotificacao(
  tipo: string,
  mensagem: string,
  faturaId?: string
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("notificacoes")
    .insert({
      tipo,
      mensagem,
      fatura_id: faturaId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Erro ao criar notificação." };
  }

  revalidatePath("/admin");
  return { data: { id: data.id } };
}

export async function getNotificacoesNaoLidas() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("notificacoes")
    .select("id, tipo, mensagem, fatura_id, created_at")
    .eq("lida", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return data;
}

export async function getContadorNotificacoes(): Promise<number> {
  const supabase = await createServerClient();

  const { count, error } = await supabase
    .from("notificacoes")
    .select("*", { count: "exact", head: true })
    .eq("lida", false);

  if (error) return 0;
  return count ?? 0;
}

export async function marcarComoLida(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao marcar notificação como lida." };
  }

  revalidatePath("/admin");
  return { data: { id } };
}

export async function marcarTodasComoLidas(): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("lida", false);

  if (error) {
    return { error: "Erro ao marcar todas as notificações como lidas." };
  }

  revalidatePath("/admin");
  return {};
}

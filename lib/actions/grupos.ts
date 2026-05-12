"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

export async function createGrupo(nome: string): Promise<ActionResult> {
  if (!nome.trim()) return { error: "Nome do grupo é obrigatório." };

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("grupos_empresariais")
    .insert({ nome: nome.trim() })
    .select("id")
    .single();

  if (error) return { error: "Erro ao criar grupo." };

  revalidatePath("/admin/grupos");
  return { data: { id: data.id } };
}

export async function updateGrupo(id: string, nome: string): Promise<ActionResult> {
  if (!nome.trim()) return { error: "Nome do grupo é obrigatório." };

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("grupos_empresariais")
    .update({ nome: nome.trim() })
    .eq("id", id);

  if (error) return { error: "Erro ao atualizar grupo." };

  revalidatePath("/admin/grupos");
  return {};
}

export async function deleteGrupo(id: string): Promise<ActionResult> {
  const supabase = await createServerClient();

  // Desvincular empresas do grupo antes de deletar
  await supabase
    .from("empresas")
    .update({ grupo_id: null })
    .eq("grupo_id", id);

  const { error } = await supabase
    .from("grupos_empresariais")
    .delete()
    .eq("id", id);

  if (error) return { error: "Erro ao excluir grupo." };

  revalidatePath("/admin/grupos");
  return {};
}

export interface GrupoComEmpresas {
  id: string;
  nome: string;
  created_at: string;
  empresas: { id: string; nome: string; cnpj: string; ativa: boolean }[];
}

export async function getGrupos(): Promise<GrupoComEmpresas[]> {
  const supabase = await createServerClient();

  const { data: grupos, error } = await supabase
    .from("grupos_empresariais")
    .select("id, nome, created_at")
    .order("nome");

  if (error || !grupos) return [];

  // Buscar empresas de cada grupo
  const grupoIds = grupos.map((g) => g.id);

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nome, cnpj, ativa, grupo_id")
    .in("grupo_id", grupoIds.length > 0 ? grupoIds : ["_none_"])
    .order("nome");

  return grupos.map((g) => ({
    ...g,
    empresas: (empresas ?? [])
      .filter((e) => e.grupo_id === g.id)
      .map(({ grupo_id, ...rest }) => rest),
  }));
}

export async function getGruposSimples(): Promise<{ id: string; nome: string }[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("grupos_empresariais")
    .select("id, nome")
    .order("nome");

  if (error || !data) return [];
  return data;
}

export async function vincularEmpresaAoGrupo(
  empresaId: string,
  grupoId: string | null
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("empresas")
    .update({ grupo_id: grupoId })
    .eq("id", empresaId);

  if (error) return { error: "Erro ao vincular empresa ao grupo." };

  revalidatePath("/admin/grupos");
  revalidatePath("/admin/clientes");
  return {};
}

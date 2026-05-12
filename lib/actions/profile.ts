"use server";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Retorna todos os empresa_ids acessíveis pelo cliente logado.
 * - Se a empresa pertence a um grupo: retorna todas as empresas do grupo
 * - Se não pertence a grupo: retorna apenas [empresa_id]
 */
export async function getEmpresaIdsAcessiveis(empresaId: string): Promise<string[]> {
  const supabase = await createServerClient();

  // Buscar empresa e seu grupo
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, grupo_id")
    .eq("id", empresaId)
    .single();

  if (!empresa) return [empresaId];

  if (empresa.grupo_id) {
    // Buscar todas as empresas do mesmo grupo
    const { data: empresasDoGrupo } = await supabase
      .from("empresas")
      .select("id")
      .eq("grupo_id", empresa.grupo_id)
      .eq("ativa", true);

    return empresasDoGrupo?.map((e) => e.id) ?? [empresaId];
  }

  return [empresaId];
}

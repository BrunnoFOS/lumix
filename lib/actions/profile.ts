"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, nome, email, empresa_id, telefone, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Retorna todos os empresa_ids acessiveis pelo cliente logado.
 */
export async function getEmpresaIdsAcessiveis(empresaId: string): Promise<string[]> {
  return [empresaId];
}

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
 */
export async function getEmpresaIdsAcessiveis(empresaId: string): Promise<string[]> {
  return [empresaId];
}

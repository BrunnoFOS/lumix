"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

const MAX_USUARIOS_POR_EMPRESA = 2;

export async function getUsuariosEmpresa(empresaId: string) {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, role, telefone, created_at")
    .eq("empresa_id", empresaId)
    .eq("role", "cliente")
    .order("created_at");

  if (error) return [];
  return data;
}

export async function createUsuario(formData: FormData): Promise<ActionResult> {
  const supabase = await createServiceClient();

  const empresa_id = formData.get("empresa_id") as string;
  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;
  const senha = formData.get("senha") as string;
  const telefone = (formData.get("telefone") as string) || null;

  if (!empresa_id || !nome || !email || !senha) {
    return { error: "Nome, email e senha são obrigatórios." };
  }

  if (senha.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }

  // Verificar limite de usuários
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresa_id)
    .eq("role", "cliente");

  if (count !== null && count >= MAX_USUARIOS_POR_EMPRESA) {
    return { error: `Limite de ${MAX_USUARIOS_POR_EMPRESA} usuários por empresa atingido.` };
  }

  // Criar usuário no auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return { error: "Este email já está cadastrado." };
    }
    return { error: "Erro ao criar usuário: " + authError.message };
  }

  // Atualizar profile com empresa_id e telefone
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      empresa_id,
      telefone,
      nome,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    return { error: "Usuário criado, mas erro ao vincular à empresa." };
  }

  revalidatePath(`/admin/clientes/${empresa_id}`);
  return { data: { id: authData.user.id } };
}

export async function resetSenhaUsuario(
  userId: string,
  novaSenha: string
): Promise<ActionResult> {
  if (!novaSenha || novaSenha.length < 6) {
    return { error: "A nova senha deve ter no mínimo 6 caracteres." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: novaSenha,
  });

  if (error) {
    return { error: "Erro ao alterar senha." };
  }

  return {};
}

export async function deleteUsuario(
  userId: string,
  empresaId: string
): Promise<ActionResult> {
  const supabase = await createServiceClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return { error: "Erro ao excluir usuário." };
  }

  revalidatePath(`/admin/clientes/${empresaId}`);
  return {};
}

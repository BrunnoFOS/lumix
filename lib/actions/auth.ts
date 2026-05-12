"use server";

import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email e senha são obrigatórios." };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email ou senha incorretos." };
  }

  // Buscar role do usuário para redirecionar
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Erro ao buscar dados do usuário." };
  }

  // Usar service client para buscar profile sem RLS (evita recursão na policy do admin)
  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const redirectTo =
    profile?.role === "admin" ? "/admin/dashboard" : "/cliente/dashboard";

  return { redirectTo };
}

export async function signup(formData: FormData) {
  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!nome || !email || !password) {
    return { error: "Todos os campos são obrigatórios." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Este email já está cadastrado." };
    }
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  return { success: "Conta criada com sucesso! Verifique seu email." };
}

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email é obrigatório." };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", "")}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: "Erro ao enviar email de recuperação." };
  }

  return { success: "Email de recuperação enviado. Verifique sua caixa de entrada." };
}

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

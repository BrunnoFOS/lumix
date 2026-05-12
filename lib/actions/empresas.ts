"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { validateCNPJ, cleanCNPJ } from "@/lib/utils";

interface ActionResult {
  error?: string;
  data?: { id: string };
}

export async function createEmpresa(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();

  const nome = formData.get("nome") as string;
  const cnpj = cleanCNPJ(formData.get("cnpj") as string);
  const endereco = (formData.get("endereco") as string) || null;
  const cidade = (formData.get("cidade") as string) || null;
  const estado = (formData.get("estado") as string) || null;
  const cep = (formData.get("cep") as string) || null;
  const telefone = (formData.get("telefone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const responsavel = (formData.get("responsavel") as string) || null;
  const grupo_id = (formData.get("grupo_id") as string) || null;

  if (!nome || !cnpj) {
    return { error: "Nome e CNPJ são obrigatórios." };
  }

  if (!validateCNPJ(cnpj)) {
    return { error: "CNPJ inválido." };
  }

  const { data, error } = await supabase
    .from("empresas")
    .insert({
      nome,
      cnpj,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      email,
      responsavel,
      grupo_id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "CNPJ já cadastrado." };
    }
    return { error: "Erro ao criar cliente." };
  }

  revalidatePath("/admin/clientes");
  return { data: { id: data.id } };
}

export async function updateEmpresa(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const nome = formData.get("nome") as string;
  const cnpj = cleanCNPJ(formData.get("cnpj") as string);
  const endereco = (formData.get("endereco") as string) || null;
  const cidade = (formData.get("cidade") as string) || null;
  const estado = (formData.get("estado") as string) || null;
  const cep = (formData.get("cep") as string) || null;
  const telefone = (formData.get("telefone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const responsavel = (formData.get("responsavel") as string) || null;
  const grupo_id = (formData.get("grupo_id") as string) || null;

  if (!nome || !cnpj) {
    return { error: "Nome e CNPJ são obrigatórios." };
  }

  if (!validateCNPJ(cnpj)) {
    return { error: "CNPJ inválido." };
  }

  const { error } = await supabase
    .from("empresas")
    .update({
      nome,
      cnpj,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      email,
      responsavel,
      grupo_id,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "CNPJ já cadastrado." };
    }
    return { error: "Erro ao atualizar cliente." };
  }

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  return {};
}

export async function toggleEmpresa(
  id: string,
  ativa: boolean
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("empresas")
    .update({ ativa })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao alterar status da empresa." };
  }

  revalidatePath("/admin/clientes");
  return {};
}

export async function arquivarEmpresa(
  id: string,
  arquivada: boolean
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("empresas")
    .update({ arquivada })
    .eq("id", id);

  if (error) {
    return { error: "Erro ao arquivar empresa." };
  }

  revalidatePath("/admin/clientes");
  return {};
}

export async function getEmpresas(search?: string, status?: string) {
  const supabase = await createServerClient();

  let query = supabase
    .from("empresas")
    .select("id, nome, cnpj, cidade, estado, ativa, arquivada, grupo_id")
    .order("nome");

  if (status === "ativas") {
    query = query.eq("ativa", true).eq("arquivada", false);
  } else if (status === "inativas") {
    query = query.eq("ativa", false).eq("arquivada", false);
  } else if (status === "arquivadas") {
    query = query.eq("arquivada", true);
  } else {
    query = query.eq("arquivada", false);
  }

  if (search) {
    query = query.or(`nome.ilike.%${search}%,cnpj.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
}

export async function getEmpresa(id: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getEmpresaComRelacionamentos(id: string) {
  const supabase = await createServerClient();

  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !empresa) return null;

  // Buscar UCs da empresa
  const { data: ucs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, potencia_instalada_kwp, ativa, station_id, distribuidora")
    .eq("empresa_id", id)
    .eq("ativa", true)
    .order("codigo_uc");

  // Buscar empresas do mesmo grupo
  let grupoEmpresas: { id: string; nome: string; cnpj: string; ativa: boolean }[] = [];
  if (empresa.grupo_id) {
    const { data } = await supabase
      .from("empresas")
      .select("id, nome, cnpj, ativa")
      .eq("grupo_id", empresa.grupo_id)
      .neq("id", id)
      .order("nome");
    grupoEmpresas = data ?? [];
  }

  return {
    ...empresa,
    ucs: ucs ?? [],
    grupoEmpresas,
  };
}

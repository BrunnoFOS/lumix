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

export async function arquivarEmpresa(
  id: string,
  arquivada: boolean
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("empresas")
    .update({ arquivada, ativa: !arquivada })
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
    .select("id, nome, cnpj, cidade, estado, ativa, arquivada")
    .order("nome");

  if (status === "ativas") {
    query = query.eq("ativa", true).eq("arquivada", false);
  } else if (status === "arquivadas") {
    query = query.eq("arquivada", true);
  }
  // else: sem filtro — retorna todas (ativas + arquivadas)

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
    .select("id, nome, cnpj, tipo, matriz_id, endereco, cidade, estado, cep, telefone, email, responsavel, ativa, arquivada, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getEmpresaComRelacionamentos(id: string) {
  const supabase = await createServerClient();

  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("id, nome, cnpj, tipo, matriz_id, endereco, cidade, estado, cep, telefone, email, responsavel, ativa, arquivada, created_at, updated_at")
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

  // Buscar station_ids vinculados via uc_stations
  const ucIds = (ucs ?? []).map((uc) => uc.id);
  const { data: ucStationsRows } = ucIds.length > 0
    ? await supabase.from("uc_stations").select("station_id").in("uc_id", ucIds)
    : { data: [] as { station_id: string }[] };

  return {
    ...empresa,
    ucs: ucs ?? [],
    stationIdsVinculados: [
      ...(ucs ?? []).filter((uc) => uc.station_id).map((uc) => uc.station_id as string),
      ...(ucStationsRows ?? []).map((row) => row.station_id),
    ],
  };
}

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

  // Parallelize empresa + UCs (both use `id` directly)
  const [{ data: empresa, error }, { data: ucs }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, nome, cnpj, tipo, matriz_id, endereco, cidade, estado, cep, telefone, email, responsavel, ativa, arquivada, created_at, updated_at")
      .eq("id", id)
      .single(),
    supabase
      .from("unidades_consumidoras")
      .select("id, codigo_uc, potencia_instalada_kwp, ativa, arquivada, station_id, distribuidora")
      .eq("empresa_id", id)
      .order("ativa", { ascending: false })
      .order("codigo_uc"),
  ]);

  if (error || !empresa) return null;

  // Buscar station_ids vinculados via uc_stations (depends on UCs result)
  const ucIds = (ucs ?? []).map((uc) => uc.id);
  const { data: ucStationsRows } = ucIds.length > 0
    ? await supabase.from("uc_stations").select("uc_id, station_id, provider").in("uc_id", ucIds)
    : { data: [] as { uc_id: string; station_id: string; provider: string }[] };

  // Buscar nomes das stations no cache para exibir stations adicionais
  const allStationIds = (ucStationsRows ?? []).map((r) => r.station_id);
  const { data: cacheRows } = allStationIds.length > 0
    ? await supabase
        .from("usinas_cache")
        .select("station_id, station_name, potencia_instalada_kwp, inversores_detalhe")
        .in("station_id", allStationIds)
    : { data: [] as { station_id: string; station_name: string; potencia_instalada_kwp: number; inversores_detalhe: { state: number }[] | null }[] };

  const cacheMap = new Map((cacheRows ?? []).map((r) => [r.station_id, r]));

  // Computar status da usina para cada station com base nos inversores
  // "online" = pelo menos 1 inversor online, "offline" = todos offline, "alerta" = pelo menos 1 em alarme, null = sem dados
  function computeUsinaStatus(stationIds: string[]): "online" | "offline" | "alerta" | null {
    const allInversores: { state: number }[] = [];
    for (const sid of stationIds) {
      const cache = cacheMap.get(sid);
      const inv = cache?.inversores_detalhe;
      if (inv && Array.isArray(inv)) allInversores.push(...inv);
    }
    if (allInversores.length === 0) return null;
    if (allInversores.some((inv) => inv.state === 1)) return "online";
    if (allInversores.some((inv) => inv.state === 3)) return "alerta";
    return "offline";
  }

  // Expandir UCs: para cada UC com múltiplas stations, criar uma linha por station
  const expandedUcs: Array<
    (typeof ucs extends (infer T)[] | null ? T : never) & {
      is_station_adicional?: boolean;
      station_id_adicional?: string;
      uc_principal_nome?: string;
      usina_status?: "online" | "offline" | "alerta" | null;
    }
  > = [];

  for (const uc of ucs ?? []) {
    const ucStations = (ucStationsRows ?? []).filter((s) => s.uc_id === uc.id);
    const stationIds = ucStations.map((s) => s.station_id);
    const usinaStatus = stationIds.length > 0 ? computeUsinaStatus(stationIds) : null;

    if (ucStations.length <= 1) {
      expandedUcs.push({ ...uc, usina_status: usinaStatus });
    } else {
      // Linha principal da UC (station que tem o mesmo nome ou a primeira)
      expandedUcs.push({ ...uc, usina_status: usinaStatus });

      // Linhas adicionais para stations com nome diferente do codigo_uc
      for (const station of ucStations) {
        const cache = cacheMap.get(station.station_id);
        const stationName = cache?.station_name ?? station.station_id;
        if (stationName === uc.codigo_uc) continue;

        const stationStatus = computeUsinaStatus([station.station_id]);
        expandedUcs.push({
          ...uc,
          codigo_uc: stationName,
          potencia_instalada_kwp: cache?.potencia_instalada_kwp ?? uc.potencia_instalada_kwp,
          distribuidora: station.provider === "sungrow" ? "SunGrow" : "Solis",
          is_station_adicional: true,
          station_id_adicional: station.station_id,
          uc_principal_nome: uc.codigo_uc,
          usina_status: stationStatus,
        });
      }
    }
  }

  return {
    ...empresa,
    ucs: expandedUcs,
    stationIdsVinculados: [
      ...(ucs ?? []).filter((uc) => uc.station_id).map((uc) => uc.station_id as string),
      ...(ucStationsRows ?? []).map((row) => row.station_id),
    ],
  };
}

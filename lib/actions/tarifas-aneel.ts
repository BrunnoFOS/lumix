"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export interface TarifaAneelRow {
  sigla: string;
  subgrupo: string;
  modalidade: string | null;
  posto: string;
  tusd: number;
  te: number;
  vigencia_inicio: string; // YYYY-MM-DD
  vigencia_fim: string | null;
  detalhe?: string | null;
}

interface ImportResult {
  error?: string;
  inseridos?: number;
  duplicados?: number;
  descartados?: number;
}

export async function importarTarifasAneel(
  rows: TarifaAneelRow[]
): Promise<ImportResult> {
  if (!rows.length) {
    return { error: "Nenhum registro para importar." };
  }

  const supabase = await createServerClient();

  // Filtrar apenas registros com Detalhe = "Não se aplica" (tarifa padrão do consumidor)
  const hasDetalhe = rows.some((r) => r.detalhe);
  const validRows = hasDetalhe
    ? rows.filter((r) => {
        const d = r.detalhe?.trim().toLowerCase() ?? "";
        return !d || d.includes("não se aplica");
      })
    : rows;

  const descartados = rows.length - validRows.length;

  const records = validRows.map((r) => ({
    sigla: r.sigla.trim().toUpperCase(),
    subgrupo: r.subgrupo.trim().toUpperCase(),
    modalidade: r.modalidade?.trim() || null,
    posto: r.posto.trim(),
    tusd: r.tusd,
    te: r.te,
    vigencia_inicio: r.vigencia_inicio,
    vigencia_fim: r.vigencia_fim,
  }));

  if (!records.length) {
    return { error: "Nenhum registro válido após filtragem.", descartados };
  }

  // Inserir em chunks via RPC (Postgres faz ON CONFLICT DO NOTHING)
  const CHUNK_SIZE = 3000;
  let inseridos = 0;
  let duplicados = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase.rpc("importar_tarifas_aneel", {
      payload: chunk,
    });

    if (error) {
      console.error("[tarifas-aneel] erro RPC:", error);
      return {
        error: `Erro ao importar: ${error.message}`,
        inseridos,
      };
    }

    const result = data as { inseridos: number; duplicados: number };
    inseridos += result.inseridos;
    duplicados += result.duplicados;
  }

  revalidatePath("/admin/tarifas");
  return { inseridos, duplicados, descartados };
}

interface TarifaAneelRecord {
  id: string;
  sigla: string;
  subgrupo: string;
  modalidade: string | null;
  posto: string;
  tusd: number;
  te: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  importado_em: string;
}

export async function getTarifasAneel(sigla?: string, apenasVigentes = false) {
  const supabase = await createServerClient();

  const PAGE_SIZE = 1000;
  let allData: TarifaAneelRecord[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("tarifas_aneel")
      .select("id, sigla, subgrupo, modalidade, posto, tusd, te, vigencia_inicio, vigencia_fim, importado_em")
      .order("sigla")
      .order("subgrupo")
      .order("posto")
      .order("vigencia_inicio", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (sigla) {
      query = query.ilike("sigla", `%${sigla}%`);
    }

    if (apenasVigentes) {
      const hoje = new Date().toISOString().split("T")[0];
      query = query.lte("vigencia_inicio", hoje).or(`vigencia_fim.is.null,vigencia_fim.gte.${hoje}`);
    }

    const { data, error } = await query;
    if (error || !data) break;

    allData = allData.concat(data as TarifaAneelRecord[]);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allData;
}

// ——— Lookup para formulário de cliente (cascata) ———

export interface TarifaOpcoes {
  subgrupos: string[];
  siglas: string[];
  modalidades: string[];
}

/**
 * Retorna opções filtradas em cascata.
 * - subgrupo filtra por prefixo do grupo (A* ou B*)
 * - sigla filtra por subgrupo selecionado
 * - modalidade filtra por subgrupo + sigla selecionados
 */
export async function getOpcoesTarifarias(filtros?: {
  grupo?: string;
  subgrupo?: string;
  sigla?: string;
}): Promise<TarifaOpcoes> {
  const supabase = await createServerClient();
  const hoje = new Date().toISOString().split("T")[0];
  const fimFilter = `vigencia_fim.is.null,vigencia_fim.gte.${hoje}`;

  // Base query builder com vigência
  function base() {
    return supabase
      .from("tarifas_aneel")
      .select("subgrupo, sigla, modalidade")
      .lte("vigencia_inicio", hoje)
      .or(fimFilter);
  }

  // Subgrupos: filtrar pelo prefixo do grupo (A* ou B*)
  let subgrupoQuery = base();
  if (filtros?.grupo === "grupo_a") {
    subgrupoQuery = subgrupoQuery.like("subgrupo", "A%");
  } else if (filtros?.grupo === "grupo_b") {
    subgrupoQuery = subgrupoQuery.like("subgrupo", "B%");
  }

  // Siglas: filtrar pelo subgrupo selecionado
  let siglaQuery = base();
  if (filtros?.subgrupo) {
    siglaQuery = siglaQuery.eq("subgrupo", filtros.subgrupo);
  }
  if (filtros?.grupo === "grupo_a") {
    siglaQuery = siglaQuery.like("subgrupo", "A%");
  } else if (filtros?.grupo === "grupo_b") {
    siglaQuery = siglaQuery.like("subgrupo", "B%");
  }

  // Modalidades: filtrar pelo subgrupo + sigla
  let modalidadeQuery = base();
  if (filtros?.subgrupo) {
    modalidadeQuery = modalidadeQuery.eq("subgrupo", filtros.subgrupo);
  }
  if (filtros?.sigla) {
    modalidadeQuery = modalidadeQuery.eq("sigla", filtros.sigla);
  }

  const [subRes, sigRes, modRes] = await Promise.all([
    subgrupoQuery,
    siglaQuery,
    modalidadeQuery,
  ]);

  return {
    subgrupos: [...new Set((subRes.data ?? []).map((r) => r.subgrupo))].sort(),
    siglas: [...new Set((sigRes.data ?? []).map((r) => r.sigla))].sort(),
    modalidades: [...new Set((modRes.data ?? []).map((r) => r.modalidade).filter(Boolean))].sort() as string[],
  };
}

export interface TarifaLookupResult {
  posto: string;
  tusd: number;
  te: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
}

export async function lookupTarifas(
  sigla: string,
  subgrupo: string,
  modalidade: string | null
): Promise<TarifaLookupResult[]> {
  const supabase = await createServerClient();
  const hoje = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("tarifas_aneel")
    .select("posto, tusd, te, vigencia_inicio, vigencia_fim")
    .eq("sigla", sigla)
    .eq("subgrupo", subgrupo)
    .lte("vigencia_inicio", hoje)
    .or(`vigencia_fim.is.null,vigencia_fim.gte.${hoje}`)
    .order("posto");

  if (modalidade) {
    query = query.eq("modalidade", modalidade);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

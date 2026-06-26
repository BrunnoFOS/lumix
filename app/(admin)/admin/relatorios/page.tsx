import { Suspense } from "react";
import { getRelatorios } from "@/lib/actions/relatorios";
import { RelatorioSearch } from "@/components/admin/RelatorioSearch";
import { RelatorioPageClient } from "@/components/admin/RelatorioPageClient";
import { SolisGeracaoMensal } from "@/components/admin/SolisGeracaoMensal";
import { createServerClient } from "@/lib/supabase/server";
import { fetchSolisUCs } from "@/lib/actions/solis";
import type { UCOption } from "@/lib/actions/solis";
import { getUCsComStations } from "@/lib/actions/unidades";
import { getEmpresas } from "@/lib/actions/empresas";

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

async function fetchDbUcs() {
  const supabase = await createServerClient();
  const { data: rawUcs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, empresa:empresas(id, nome)")
    .eq("ativa", true)
    .order("codigo_uc");

  return (rawUcs ?? []).map((uc) => {
    const empresaRaw = uc.empresa as unknown;
    return {
      id: uc.id,
      codigo_uc: uc.codigo_uc,
      empresa: (Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw) as { id: string; nome: string } | null,
    };
  });
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const params = await searchParams;

  const supabase = await createServerClient();

  // Buscar tudo em paralelo, incluindo Solis UCs e faturas processadas
  const [relatorios, empresas, ucsComStations, dbUcs, solisResult, { data: fpsData }] = await Promise.all([
    getRelatorios(params.search, params.status),
    getEmpresas(),
    getUCsComStations(),
    fetchDbUcs(),
    fetchSolisUCs(),
    supabase
      .from("faturas_processadas")
      .select("id, uc_id, mes_referencia, pdf_fatura_url")
      .eq("status", "gerado"),
  ]);

  // Map de faturas processadas por uc_id|mes_referencia
  const faturasProcessadasMap: Record<string, { id: string; pdf_fatura_url: string | null }> = {};
  for (const fp of fpsData ?? []) {
    faturasProcessadasMap[`${fp.uc_id}|${fp.mes_referencia}`] = {
      id: fp.id,
      pdf_fatura_url: fp.pdf_fatura_url,
    };
  }

  // Montar UCOptions sem query adicional (inline do que getUCsComSolis fazia)
  const dbOptions: UCOption[] = dbUcs.map((uc) => ({
    ...uc,
    source: "database" as const,
  }));

  const solisOptions: UCOption[] = solisResult.data
    .filter((s) => !dbUcs.some((db) => db.codigo_uc === s.station_id))
    .map((s) => ({
      id: `solis:${s.station_id}`,
      codigo_uc: s.station_name,
      empresa: null,
      source: "solis" as const,
      station_name: s.station_name,
    }));

  const ucs = [...dbOptions, ...solisOptions];

  const empresasOptions = empresas.map((e) => ({ id: e.id, nome: e.nome }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {relatorios.length} relatório{relatorios.length !== 1 && "s"}
        </p>
      </div>

      {/* Geração mensal */}
      {ucsComStations.length > 0 && (
        <SolisGeracaoMensal empresas={empresasOptions} ucs={ucsComStations} />
      )}

      <Suspense>
        <RelatorioSearch />
      </Suspense>

      <RelatorioPageClient relatorios={relatorios} ucs={ucs} faturasProcessadasMap={faturasProcessadasMap} />
    </div>
  );
}

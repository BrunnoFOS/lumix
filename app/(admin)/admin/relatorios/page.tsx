import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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

async function GeracaoMensalSection() {
  const [empresas, ucsComStations] = await Promise.all([
    getEmpresas(),
    getUCsComStations(),
  ]);

  if (ucsComStations.length === 0) return null;

  const empresasOptions = empresas.map((e) => ({ id: e.id, nome: e.nome }));
  return <SolisGeracaoMensal empresas={empresasOptions} ucs={ucsComStations} />;
}

async function RelatorioListSection({ search, status }: { search?: string; status?: string }) {
  const supabase = await createServerClient();

  const [relatorios, dbUcs, solisResult, { data: fpsData }] = await Promise.all([
    getRelatorios(search, status),
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

  // Montar UCOptions
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

  return <RelatorioPageClient relatorios={relatorios} ucs={ucs} faturasProcessadasMap={faturasProcessadasMap} />;
}

function GeracaoMensalFallback() {
  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}

function RelatorioListFallback() {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border p-4">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-border p-4 last:border-0">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie relatórios de geração
        </p>
      </div>

      {/* Geração mensal — streamed independently */}
      <Suspense fallback={<GeracaoMensalFallback />}>
        <GeracaoMensalSection />
      </Suspense>

      <Suspense>
        <RelatorioSearch />
      </Suspense>

      {/* Relatórios list — streamed independently */}
      <Suspense fallback={<RelatorioListFallback />}>
        <RelatorioListSection search={params.search} status={params.status} />
      </Suspense>
    </div>
  );
}

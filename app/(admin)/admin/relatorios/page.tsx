import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getRelatorios } from "@/lib/actions/relatorios";
import { RelatorioSearch } from "@/components/admin/RelatorioSearch";
import { RelatorioPageClient } from "@/components/admin/RelatorioPageClient";
import { SolisGeracaoMensal } from "@/components/admin/SolisGeracaoMensal";
import { UsinasOfflineBanner } from "@/components/admin/UsinasOfflineBanner";
import { createServerClient } from "@/lib/supabase/server";
import { getUCsComStations } from "@/lib/actions/unidades";
import { getEmpresas } from "@/lib/actions/empresas";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ search?: string; status?: string; arquivado?: string }>;
}

async function GeracaoMensalSection() {
  const [empresas, ucsComStations] = await Promise.all([
    getEmpresas(),
    getUCsComStations(),
  ]);

  if (ucsComStations.length === 0) return null;

  const empresasOptions = empresas.map((e: { id: string; nome: string }) => ({ id: e.id, nome: e.nome }));
  return <SolisGeracaoMensal empresas={empresasOptions} ucs={ucsComStations} />;
}

async function RelatorioListSection({ search, status, arquivado }: { search?: string; status?: string; arquivado?: string }) {
  const supabase = await createServerClient();

  const [relatorios, { data: fpsData }] = await Promise.all([
    getRelatorios(search, status, undefined, arquivado),
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

  return <RelatorioPageClient relatorios={relatorios} faturasProcessadasMap={faturasProcessadasMap} />;
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

      {/* Banner de usinas offline */}
      <Suspense fallback={null}>
        <UsinasOfflineBanner />
      </Suspense>

      {/* Geração mensal — streamed independently */}
      <Suspense fallback={<GeracaoMensalFallback />}>
        <GeracaoMensalSection />
      </Suspense>

      <Suspense>
        <RelatorioSearch />
      </Suspense>

      {/* Relatórios list — streamed independently */}
      <Suspense fallback={<RelatorioListFallback />}>
        <RelatorioListSection search={params.search} status={params.status} arquivado={params.arquivado} />
      </Suspense>
    </div>
  );
}

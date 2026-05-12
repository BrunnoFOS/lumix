import { Suspense } from "react";
import { getRelatorios } from "@/lib/actions/relatorios";
import { RelatorioSearch } from "@/components/admin/RelatorioSearch";
import { RelatorioPageClient } from "@/components/admin/RelatorioPageClient";
import { SolisGeracaoMensal } from "@/components/admin/SolisGeracaoMensal";
import type { UsinaComProvider } from "@/components/admin/SolisGeracaoMensal";
import { createServerClient } from "@/lib/supabase/server";
import { fetchSolisUCs, fetchSungrowUCs, getUCsComSolis } from "@/lib/actions/solis";

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const params = await searchParams;
  const [relatorios, solisUCs, sungrowUCs] = await Promise.all([
    getRelatorios(params.search, params.status),
    fetchSolisUCs(),
    fetchSungrowUCs(),
  ]);

  const todasUsinas: UsinaComProvider[] = [
    ...solisUCs.data.map((u) => ({ ...u, provider: "solis" as const })),
    ...sungrowUCs.data.map((u) => ({ ...u, provider: "sungrow" as const })),
  ];

  const supabase = await createServerClient();
  const { data: rawUcs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, empresa:empresas(id, nome)")
    .eq("ativa", true)
    .order("codigo_uc");

  const dbUcs = (rawUcs ?? []).map((uc) => {
    const empresaRaw = uc.empresa as unknown;
    return {
      id: uc.id,
      codigo_uc: uc.codigo_uc,
      empresa: (Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw) as { id: string; nome: string } | null,
    };
  });

  const ucs = await getUCsComSolis(dbUcs);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {relatorios.length} relatório{relatorios.length !== 1 && "s"}
        </p>
      </div>

      {/* Geração mensal */}
      {todasUsinas.length > 0 && (
        <SolisGeracaoMensal usinas={todasUsinas} />
      )}

      <Suspense>
        <RelatorioSearch />
      </Suspense>

      <RelatorioPageClient relatorios={relatorios} ucs={ucs} />
    </div>
  );
}

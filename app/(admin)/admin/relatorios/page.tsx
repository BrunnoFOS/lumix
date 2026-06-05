import { Suspense } from "react";
import { getRelatorios } from "@/lib/actions/relatorios";
import { RelatorioSearch } from "@/components/admin/RelatorioSearch";
import { RelatorioPageClient } from "@/components/admin/RelatorioPageClient";
import { SolisGeracaoMensal } from "@/components/admin/SolisGeracaoMensal";
import { createServerClient } from "@/lib/supabase/server";
import { getUCsComSolis } from "@/lib/actions/solis";
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
  const [relatorios, empresas, ucsComStations, dbUcs] = await Promise.all([
    getRelatorios(params.search, params.status),
    getEmpresas(),
    getUCsComStations(),
    fetchDbUcs(),
  ]);

  const ucs = await getUCsComSolis(dbUcs);

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

      <RelatorioPageClient relatorios={relatorios} ucs={ucs} />
    </div>
  );
}

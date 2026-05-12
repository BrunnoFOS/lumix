import { Suspense } from "react";
import { getTarifasAneel } from "@/lib/actions/tarifas-aneel";
import { TarifaSearch } from "@/components/admin/TarifaSearch";
import { TarifaPageClient } from "@/components/admin/TarifaPageClient";

interface Props {
  searchParams: Promise<{ sigla?: string; vigencia?: string }>;
}

export default async function TarifasPage({ searchParams }: Props) {
  const params = await searchParams;
  const apenasVigentes = params.vigencia !== "todas";
  const tarifas = await getTarifasAneel(params.sigla, apenasVigentes);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tarifas ANEEL</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tarifas.length} tarifa{tarifas.length !== 1 && "s"}
          {apenasVigentes && " vigente"}
          {apenasVigentes && tarifas.length !== 1 && "s"}
        </p>
      </div>

      <Suspense>
        <TarifaSearch />
      </Suspense>

      <TarifaPageClient tarifas={tarifas} />
    </div>
  );
}

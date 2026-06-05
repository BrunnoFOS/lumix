import { Suspense } from "react";
import { getImpostos } from "@/lib/actions/impostos";
import { ImpostosPageClient } from "@/components/admin/ImpostosPageClient";

export default async function ImpostosPage() {
  const impostos = await getImpostos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impostos por Concessionária</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alíquotas de ICMS, PIS e COFINS aplicadas sobre tarifas ANEEL para cálculo de economia.
        </p>
      </div>

      <Suspense>
        <ImpostosPageClient impostos={impostos} />
      </Suspense>
    </div>
  );
}

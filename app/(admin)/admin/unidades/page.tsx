export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Radio, Sun } from "lucide-react";
import { UCSearch } from "@/components/admin/UCSearch";
import { SolisUCTable } from "@/components/admin/SolisUCTable";
import { getUCs } from "@/lib/actions/unidades";
import { getEmpresas } from "@/lib/actions/empresas";
import { fetchSolisUCs, fetchSungrowUCs } from "@/lib/actions/solis";
import { getOpcoesTarifarias } from "@/lib/actions/tarifas-aneel";

import type { UsinaUC } from "@/lib/actions/solis";

function filterUCs(
  ucs: UsinaUC[],
  params: { search?: string; empresa?: string; vinculacao?: string },
  vinculadas: Record<string, { ucId: string; empresaNome: string; grupo_tarifario?: string | null }>
): UsinaUC[] {
  let filtered = ucs;

  if (params.search) {
    const term = params.search.toLowerCase();
    filtered = filtered.filter((uc) =>
      uc.station_name.toLowerCase().includes(term)
    );
  }

  if (params.empresa) {
    filtered = filtered.filter((uc) => {
      const v = vinculadas[uc.station_id];
      return v !== undefined;
    });
  }

  if (params.vinculacao === "vinculadas") {
    filtered = filtered.filter((uc) => vinculadas[uc.station_id]);
  } else if (params.vinculacao === "nao_vinculadas") {
    filtered = filtered.filter((uc) => !vinculadas[uc.station_id]);
  } else if (params.vinculacao === "com_tarifa") {
    filtered = filtered.filter((uc) => vinculadas[uc.station_id]?.grupo_tarifario);
  } else if (params.vinculacao === "sem_tarifa") {
    filtered = filtered.filter((uc) => !vinculadas[uc.station_id]?.grupo_tarifario);
  }

  return filtered;
}

interface Props {
  searchParams: Promise<{ search?: string; empresa?: string; vinculacao?: string; provider?: string }>;
}

export default async function UnidadesPage({ searchParams }: Props) {
  const params = await searchParams;
  const [unidades, empresas, solis, sungrow, opcoesTarifarias] = await Promise.all([
    getUCs(params.search, params.empresa),
    getEmpresas(),
    fetchSolisUCs(),
    fetchSungrowUCs(),
    getOpcoesTarifarias(),
  ]);

  // Mapa station_id → info da UC vinculada (incluindo dados tarifários)
  const vinculadas: Record<string, {
    ucId: string;
    empresaNome: string;
    grupo_tarifario?: string | null;
    subgrupo?: string | null;
    concessionaria_sigla?: string | null;
    modalidade_tarifaria_aneel?: string | null;
  }> = {};

  for (const uc of unidades) {
    if (uc.station_id) {
      const emp = uc.empresa as { id: string; nome: string }[] | { id: string; nome: string } | null;
      const nome = Array.isArray(emp) ? emp[0]?.nome ?? "" : emp?.nome ?? "";
      vinculadas[uc.station_id] = {
        ucId: uc.id,
        empresaNome: nome,
        grupo_tarifario: (uc as Record<string, unknown>).grupo_tarifario as string | null,
        subgrupo: (uc as Record<string, unknown>).subgrupo as string | null,
        concessionaria_sigla: (uc as Record<string, unknown>).concessionaria_sigla as string | null,
        modalidade_tarifaria_aneel: (uc as Record<string, unknown>).modalidade_tarifaria_aneel as string | null,
      };
    }
  }

  const totalUsinas = solis.data.length + sungrow.data.length;
  const totalVinculadas = Object.keys(vinculadas).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Unidades Consumidoras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalUsinas} usina{totalUsinas !== 1 && "s"} detectada{totalUsinas !== 1 && "s"}
          {" · "}
          {totalVinculadas} vinculada{totalVinculadas !== 1 && "s"}
        </p>
      </div>

      <Suspense>
        <UCSearch empresas={empresas.map((e) => ({ id: e.id, nome: e.nome }))} />
      </Suspense>

      {/* Usinas Solis */}
      {(!params.provider || params.provider === "solis") && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Usinas Solis</h2>
            <span className="text-sm text-muted-foreground">
              ({solis.data.length})
            </span>
          </div>
          <SolisUCTable
            ucs={filterUCs(solis.data, params, vinculadas)}
            error={solis.error}
            vinculadas={vinculadas}
            opcoesTarifarias={opcoesTarifarias}
          />
        </div>
      )}

      {/* Usinas SunGrow */}
      {(!params.provider || params.provider === "sungrow") && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-semibold text-foreground">Usinas SunGrow</h2>
            <span className="text-sm text-muted-foreground">
              ({sungrow.data.length})
            </span>
          </div>
          <SolisUCTable
            ucs={filterUCs(sungrow.data, params, vinculadas)}
            error={sungrow.error}
            vinculadas={vinculadas}
            opcoesTarifarias={opcoesTarifarias}
          />
        </div>
      )}
    </div>
  );
}

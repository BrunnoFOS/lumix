"use client";

import { ImportarTarifasAneel } from "@/components/admin/ImportarTarifasAneel";
import { TarifaAneelTable } from "@/components/admin/TarifaTable";

interface TarifaAneel {
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

export function TarifaPageClient({ tarifas }: { tarifas: TarifaAneel[] }) {
  return (
    <>
      <div className="flex justify-end">
        <ImportarTarifasAneel />
      </div>

      <TarifaAneelTable tarifas={tarifas} />
    </>
  );
}

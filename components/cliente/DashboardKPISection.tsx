"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { DashboardCards } from "@/components/cliente/DashboardCards";
import { getResumoGeracaoClienteRange } from "@/lib/actions/dados-geracao";

interface ResumoData {
  geracao_total: number;
  estimada_total: number;
  economia_total: number;
  performance: string | null;
  performance_ratio: number | null;
}

interface Props {
  empresaId: string;
  ucIds: string[];
  initialResumo: ResumoData;
  defaultMes?: string;
}

function defaultDates(mes?: string) {
  if (!mes) return { inicio: "", fim: "" };
  const [y, m] = mes.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    inicio: `${y}-${mm}-01`,
    fim: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

function toMesReferencia(dateStr: string): string {
  return dateStr.substring(0, 7) + "-01";
}

export function DashboardKPISection({ empresaId, ucIds, initialResumo, defaultMes }: Props) {
  const defaults = defaultDates(defaultMes);
  const [inicio, setInicio] = useState(defaults.inicio);
  const [fim, setFim] = useState(defaults.fim);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<ResumoData>(initialResumo);

  async function handleBuscar() {
    if (!inicio || !fim) return;
    setLoading(true);

    const mesInicio = toMesReferencia(inicio);
    const mesFim = toMesReferencia(fim);

    const result = await getResumoGeracaoClienteRange(empresaId, mesInicio, mesFim, ucIds);

    setResumo({
      geracao_total: result.geracao_total,
      estimada_total: result.estimada_total,
      economia_total: result.economia_total,
      performance: result.performance,
      performance_ratio: result.performance_ratio,
    });

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">
          Período:
        </Label>
        <Input
          type="date"
          className="w-40"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleBuscar();
          }}
        />
        <span className="text-sm text-muted-foreground">a</span>
        <Input
          type="date"
          className="w-40"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleBuscar();
          }}
        />
        <Button
          size="sm"
          onClick={handleBuscar}
          disabled={loading || !inicio || !fim}
        >
          {loading ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="mr-1 h-4 w-4" />
              Filtrar
            </>
          )}
        </Button>
      </div>

      <DashboardCards
        geracaoTotal={resumo.geracao_total}
        estimadaTotal={resumo.estimada_total}
        economiaTotal={resumo.economia_total}
        performance={resumo.performance}
        performanceRatio={resumo.performance_ratio}
      />
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatKWh } from "@/lib/utils";
import { Zap, TrendingUp, DollarSign, Activity } from "lucide-react";

interface DashboardCardsProps {
  geracaoTotal: number;
  estimadaTotal: number;
  economiaTotal: number;
  performance: string | null;
  performanceRatio: number | null;
}

const PERFORMANCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bom: { label: "Bom", color: "text-emerald-600", bg: "bg-emerald-50" },
  regular: { label: "Regular", color: "text-amber-600", bg: "bg-amber-50" },
  ruim: { label: "Ruim", color: "text-red-600", bg: "bg-red-50" },
};

export function DashboardCards({
  geracaoTotal,
  estimadaTotal,
  economiaTotal,
  performance,
  performanceRatio,
}: DashboardCardsProps) {
  const perf = performance ? PERFORMANCE_CONFIG[performance] : null;
  const percentualGeracao = estimadaTotal > 0
    ? ((geracaoTotal / estimadaTotal) * 100).toFixed(1)
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Geração total */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-50 p-2">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Geração total</p>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {formatKWh(geracaoTotal)}
          </p>
          {percentualGeracao && (
            <p className="mt-1 text-sm text-muted-foreground">
              {percentualGeracao}% do estimado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Geração estimada */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-sm text-muted-foreground">Estimado</p>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {formatKWh(estimadaTotal)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Geração estimada mensal
          </p>
        </CardContent>
      </Card>

      {/* Economia */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground">Economia</p>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {formatCurrency(economiaTotal)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Economia estimada no mês
          </p>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${perf?.bg || "bg-gray-50"}`}>
              <Activity className={`h-5 w-5 ${perf?.color || "text-muted-foreground"}`} />
            </div>
            <p className="text-sm text-muted-foreground">Performance</p>
          </div>
          {perf ? (
            <>
              <p className={`mt-3 text-3xl font-bold ${perf.color}`}>
                {perf.label}
              </p>
              {performanceRatio !== null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  PR: {performanceRatio.toFixed(1)}%
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-lg text-muted-foreground">
              Sem dados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

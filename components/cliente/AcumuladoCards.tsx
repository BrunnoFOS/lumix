import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Sun, Wallet } from "lucide-react";

interface AcumuladoCardsProps {
  geracaoAcumulada: number;
  economiaAcumulada: number;
  atualizadoEm: string | null;
}

function formatarGeracao(kwh: number | null): string {
  if (kwh === null || kwh === undefined) return "—";
  return (
    new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(kwh) + " kWh"
  );
}

export function AcumuladoCards({
  geracaoAcumulada,
  economiaAcumulada,
  atualizadoEm,
}: AcumuladoCardsProps) {
  const hasData = geracaoAcumulada > 0 || economiaAcumulada > 0;

  if (!hasData) return null;

  const dataLabel = atualizadoEm
    ? `Atualizado em ${formatDate(atualizadoEm)}`
    : null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Desde o Início
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Geração acumulada */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <Sun className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Geração acumulada
              </p>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {formatarGeracao(geracaoAcumulada)}
            </p>
            {dataLabel && (
              <p className="mt-1 text-xs text-muted-foreground">
                {dataLabel}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Economia acumulada */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Economia acumulada
              </p>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {formatCurrency(economiaAcumulada)}
            </p>
            {dataLabel && (
              <p className="mt-1 text-xs text-muted-foreground">
                {dataLabel}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

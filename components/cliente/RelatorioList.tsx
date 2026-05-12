import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatKWh, formatMesReferencia } from "@/lib/utils";
import { PerformanceIndicator } from "@/components/cliente/PerformanceIndicator";
import { FileText, Download } from "lucide-react";

interface Relatorio {
  id: string;
  mes_referencia: string;
  titulo: string;
  geracao_kwh: number | null;
  geracao_estimada_kwh: number | null;
  economia_reais: number | null;
  indice_performance: string | null;
  pdf_url: string | null;
  uc: { id: string; codigo_uc: string } | null;
}

export function RelatorioList({ relatorios }: { relatorios: Relatorio[] }) {
  if (relatorios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
          Nenhum relatório disponível
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Os relatórios aparecerão aqui assim que forem gerados pela equipe Lumix.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {relatorios.map((rel) => (
        <Card key={rel.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-50 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground capitalize">
                  {formatMesReferencia(rel.mes_referencia)}
                </p>
                {rel.uc && (
                  <p className="text-sm text-muted-foreground">
                    UC {rel.uc.codigo_uc}
                  </p>
                )}
              </div>
            </div>

            <div className="hidden items-center gap-6 sm:flex">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Geração</p>
                <p className="text-sm font-medium">
                  {rel.geracao_kwh !== null ? formatKWh(rel.geracao_kwh) : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Economia</p>
                <p className="text-sm font-medium">
                  {rel.economia_reais !== null
                    ? formatCurrency(rel.economia_reais)
                    : "—"}
                </p>
              </div>
              <div>
                <PerformanceIndicator indice={rel.indice_performance} />
              </div>
            </div>

            {rel.pdf_url ? (
              <a href={rel.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </a>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

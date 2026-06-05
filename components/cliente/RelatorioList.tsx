"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatKWh, formatMesReferencia } from "@/lib/utils";
import { PerformanceIndicator } from "@/components/cliente/PerformanceIndicator";
import { FileText, Download, Search } from "lucide-react";

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
  const [busca, setBusca] = useState("");

  const relatoriosFiltrados = useMemo(() => {
    if (!busca.trim()) return relatorios;
    const termo = busca.toLowerCase();
    return relatorios.filter(
      (r) =>
        r.titulo?.toLowerCase().includes(termo) ||
        r.uc?.codigo_uc?.toLowerCase().includes(termo) ||
        formatMesReferencia(r.mes_referencia).toLowerCase().includes(termo) ||
        r.indice_performance?.toLowerCase().includes(termo)
    );
  }, [relatorios, busca]);

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, UC, mês ou performance..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {relatoriosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum relatório encontrado para &quot;{busca}&quot;
          </p>
        </div>
      ) : null}
      {relatoriosFiltrados.map((rel) => (
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
              <div className="text-right">
                {(() => {
                  const hasPR = rel.geracao_kwh != null && rel.geracao_estimada_kwh != null && rel.geracao_estimada_kwh > 0;
                  const pr = hasPR ? Math.round((rel.geracao_kwh! / rel.geracao_estimada_kwh!) * 100) : null;
                  const classificacao = pr != null
                    ? (pr >= 98 ? "Bom" : pr >= 90 ? "Regular" : "Ruim")
                    : null;

                  if (pr != null) {
                    return (
                      <>
                        <p className="text-sm font-medium tabular-nums">{pr}% do potencial atingido</p>
                        <p className={`text-xs font-medium ${
                          classificacao === "Bom" ? "text-green-600" :
                          classificacao === "Regular" ? "text-amber-600" :
                          "text-red-600"
                        }`}>
                          {classificacao}
                        </p>
                      </>
                    );
                  }
                  return <PerformanceIndicator indice={rel.indice_performance} />;
                })()}
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

"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatKWh, formatMesReferencia, formatDateTime, gerarNomeRelatorio } from "@/lib/utils";
import { PerformanceIndicator } from "@/components/cliente/PerformanceIndicator";
import { FileText, Download, Search, Filter } from "lucide-react";

interface Relatorio {
  id: string;
  mes_referencia: string;
  titulo: string;
  geracao_kwh: number | null;
  geracao_estimada_kwh: number | null;
  economia_reais: number | null;
  indice_performance: string | null;
  tipo_relatorio: string | null;
  pdf_url: string | null;
  created_at: string;
  uc: { id: string; codigo_uc: string } | null;
  empresa: { id: string; nome: string } | null;
}

interface UCOption {
  value: string;
  label: string;
}

interface RelatorioListProps {
  relatorios: Relatorio[];
  ucOptions?: UCOption[];
}

export function RelatorioList({ relatorios, ucOptions = [] }: RelatorioListProps) {
  const [busca, setBusca] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedUC = searchParams.get("uc") || "";
  const mesInicio = searchParams.get("inicio") || "";
  const mesFim = searchParams.get("fim") || "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/cliente/historico?${params.toString()}`);
  }

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

  if (relatorios.length === 0 && !selectedUC && !mesInicio && !mesFim) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
          Nenhum relatorio disponivel
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Os relatorios aparecerao aqui assim que forem gerados pela equipe Lumix.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {ucOptions.length > 1 && (
          <Select
            value={selectedUC || "todas"}
            onValueChange={(value) => updateParam("uc", value === "todas" ? "" : value ?? "")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Todas as UCs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as UCs</SelectItem>
              {ucOptions.map((uc) => (
                <SelectItem key={uc.value} value={uc.value}>
                  {uc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={mesInicio}
            onChange={(e) => updateParam("inicio", e.target.value)}
            className="w-full sm:w-40"
          />
          <span className="text-sm text-muted-foreground">a</span>
          <Input
            type="date"
            value={mesFim}
            onChange={(e) => updateParam("fim", e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {/* Busca textual */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por titulo, UC, mes ou performance..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {relatoriosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum relatorio encontrado
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
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground capitalize">
                    {formatMesReferencia(rel.mes_referencia)}
                  </p>
                  {rel.tipo_relatorio && (
                    <Badge
                      variant="outline"
                      className={
                        rel.tipo_relatorio === "real"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {rel.tipo_relatorio === "real" ? "Real" : "Estimado"}
                    </Badge>
                  )}
                </div>
                {rel.uc && (
                  <p className="text-sm text-muted-foreground">
                    UC {rel.uc.codigo_uc}
                  </p>
                )}
                {rel.created_at && (
                  <p className="text-xs text-muted-foreground">
                    Gerado em {formatDateTime(rel.created_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="hidden items-center gap-6 sm:flex">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Geracao</p>
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
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const nomeArquivo = gerarNomeRelatorio(
                    rel.mes_referencia,
                    rel.tipo_relatorio || "estimado",
                    rel.empresa?.nome || "Cliente"
                  );
                  try {
                    const response = await fetch(rel.pdf_url!);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = nomeArquivo;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error("Erro ao baixar PDF:", error);
                    window.open(rel.pdf_url!, "_blank");
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
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

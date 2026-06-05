"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatMesReferencia, formatCurrency } from "@/lib/utils";
import { FileText, Download, Eye, Search } from "lucide-react";

interface FaturaRow {
  id: string;
  mes_referencia: string;
  valor_faturado: number | null;
  valor_total: number | null;
  consumo_kwh: number | null;
  status: string;
  pdf_url: string | null;
  imagem_url: string | null;
  uc: { id: string; codigo_uc: string } | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  processada: "default",
  pendente: "secondary",
  erro: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  processada: "Processada",
  pendente: "Pendente",
  erro: "Erro",
};

export function FaturaList({ faturas }: { faturas: FaturaRow[] }) {
  const [busca, setBusca] = useState("");

  const faturasFiltradas = useMemo(() => {
    if (!busca.trim()) return faturas;
    const termo = busca.toLowerCase();
    return faturas.filter(
      (f) =>
        f.uc?.codigo_uc?.toLowerCase().includes(termo) ||
        formatMesReferencia(f.mes_referencia).toLowerCase().includes(termo) ||
        f.status?.toLowerCase().includes(termo)
    );
  }, [faturas, busca]);

  if (faturas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-3 text-sm font-medium text-foreground">
          Nenhuma fatura enviada
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Suas faturas enviadas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Faturas enviadas</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por UC, mês ou status..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {faturasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma fatura encontrada para &quot;{busca}&quot;
          </p>
        </div>
      ) : null}
      {faturasFiltradas.map((fatura) => (
        <div
          key={fatura.id}
          className="flex items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium capitalize">
                {formatMesReferencia(fatura.mes_referencia)}
              </p>
              {fatura.uc && (
                <p className="text-xs text-muted-foreground">
                  UC {fatura.uc.codigo_uc}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(fatura.valor_faturado ?? fatura.valor_total) != null && (
              <span className="hidden text-sm font-medium sm:block">
                {formatCurrency(fatura.valor_faturado ?? fatura.valor_total!)}
              </span>
            )}
            <Badge variant={STATUS_VARIANT[fatura.status] || "secondary"}>
              {STATUS_LABELS[fatura.status] || fatura.status}
            </Badge>
            {fatura.pdf_url && (
              <a
                href={fatura.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                title="Baixar PDF"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            {fatura.imagem_url && !fatura.pdf_url && (
              <a
                href={fatura.imagem_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                title="Ver imagem"
              >
                <Eye className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

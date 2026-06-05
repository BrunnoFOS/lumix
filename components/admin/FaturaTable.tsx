"use client";

import Link from "next/link";
import { FileText, Download, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/export-csv";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatMesReferencia, formatKWh } from "@/lib/utils";

interface FaturaRow {
  id: string;
  uc_id: string;
  mes_referencia: string;
  denominacao: string | null;
  contrato: string | null;
  valor_faturado: number | null;
  valor_total: number | null;
  consumo_kwh: number | null;
  economia_estimada: number | null;
  status: string;
  pdf_url: string | null;
  uc: {
    id: string;
    codigo_uc: string;
    empresa: { id: string; nome: string } | null;
  } | null;
}

interface RelatorioInfo {
  id: string;
  pdf_url: string | null;
  status_envio: string;
  tipo_relatorio: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  processada: "default",
  pendente: "secondary",
  erro: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  processada: "Processada",
  pendente: "Pendente",
  erro: "Erro",
};

const ENVIO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  enviado: "default",
  pendente: "secondary",
  erro: "destructive",
};

export function FaturaTable({
  faturas,
  relatorios = {},
}: {
  faturas: FaturaRow[];
  relatorios?: Record<string, RelatorioInfo>;
}) {
  if (faturas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <FileText className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma fatura encontrada.
        </p>
      </div>
    );
  }

  function handleExport() {
    exportToCSV("faturas", ["Cliente", "UC", "Mês ref.", "Contrato", "Valor faturado", "Consumo kWh", "Status"], faturas.map((f) => [
      f.uc?.empresa?.nome, f.uc?.codigo_uc, f.mes_referencia, f.contrato,
      f.valor_faturado ?? f.valor_total, f.consumo_kwh, f.status,
    ]));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>UC</TableHead>
              <TableHead>Mês ref.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Relatório</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faturas.map((fatura) => {
              const key = `${fatura.uc_id}|${fatura.mes_referencia}`;
              const rel = relatorios[key];

              return (
                <TableRow key={fatura.id}>
                  <TableCell className="font-medium">
                    {fatura.uc?.empresa?.nome || "—"}
                  </TableCell>
                  <TableCell>{fatura.uc?.codigo_uc || "—"}</TableCell>
                  <TableCell className="capitalize">
                    {formatMesReferencia(fatura.mes_referencia)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fatura.valor_faturado !== null
                      ? formatCurrency(fatura.valor_faturado)
                      : fatura.valor_total !== null
                        ? formatCurrency(fatura.valor_total)
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[fatura.status] || "outline"}>
                      {STATUS_LABELS[fatura.status] || fatura.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rel ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            rel.tipo_relatorio === "real"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          )}
                        >
                          {rel.tipo_relatorio === "real" ? "Real" : "Estimado"}
                        </Badge>
                        <Badge variant={ENVIO_VARIANT[rel.status_envio] || "outline"} className="text-[10px]">
                          {rel.status_envio === "enviado" ? "Enviado" : rel.status_envio === "pendente" ? "Pendente" : "Erro"}
                        </Badge>
                        {rel.pdf_url && (
                          <a
                            href={rel.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            title="Ver relatório"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/faturas/${fatura.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {fatura.pdf_url && (
                        <a
                          href={fatura.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                          title="Baixar fatura"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

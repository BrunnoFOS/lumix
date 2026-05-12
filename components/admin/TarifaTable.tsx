"use client";

import { useState } from "react";
import {
  DollarSign,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-csv";

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

const PAGE_SIZES = [25, 50, 100] as const;

function formatTarifa(valor: number): string {
  return valor.toFixed(6);
}

function isVigente(t: TarifaAneel): boolean {
  const hoje = new Date().toISOString().split("T")[0];
  if (t.vigencia_inicio > hoje) return false;
  if (t.vigencia_fim && t.vigencia_fim < hoje) return false;
  return true;
}

export function TarifaAneelTable({ tarifas }: { tarifas: TarifaAneel[] }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(50);

  const totalPages = Math.max(1, Math.ceil(tarifas.length / pageSize));
  const start = page * pageSize;
  const paged = tarifas.slice(start, start + pageSize);

  function handleExport() {
    exportToCSV(
      "tarifas-aneel",
      ["Sigla", "Subgrupo", "Modalidade", "Posto", "TUSD", "TE", "Vigência Início", "Vigência Fim", "Status"],
      tarifas.map((t) => [
        t.sigla,
        t.subgrupo,
        t.modalidade || "",
        t.posto,
        t.tusd,
        t.te,
        t.vigencia_inicio,
        t.vigencia_fim || "",
        isVigente(t) ? "Vigente" : "Fora de vigência",
      ])
    );
  }

  if (tarifas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <DollarSign className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma tarifa encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sigla</TableHead>
              <TableHead>Subgrupo</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Posto</TableHead>
              <TableHead className="text-right">TUSD (R$/kWh)</TableHead>
              <TableHead className="text-right">TE (R$/kWh)</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((tarifa) => {
              const vigente = isVigente(tarifa);
              return (
                <TableRow key={tarifa.id}>
                  <TableCell className="font-medium">{tarifa.sigla}</TableCell>
                  <TableCell>{tarifa.subgrupo}</TableCell>
                  <TableCell>{tarifa.modalidade || "—"}</TableCell>
                  <TableCell>{tarifa.posto}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatTarifa(tarifa.tusd)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatTarifa(tarifa.te)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(tarifa.vigencia_inicio)}
                    {tarifa.vigencia_fim && ` — ${formatDate(tarifa.vigencia_fim)}`}
                  </TableCell>
                  <TableCell>
                    {vigente ? (
                      <Badge variant="default">Vigente</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        Fora de vigência
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>
            {start + 1}–{Math.min(start + pageSize, tarifas.length)} de{" "}
            {tarifas.length}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>por página</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

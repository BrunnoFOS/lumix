"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Radio,
  AlertCircle,
  MapPin,
  Zap,
  Cpu,
  ChevronLeft,
  ChevronRight,
  LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UsinaUC } from "@/lib/actions/solis";

const PAGE_SIZE = 10;

function parseCity(cidadeUf: string | null): string {
  if (!cidadeUf) return "\u2014";
  const parts = cidadeUf.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : cidadeUf;
}

function inversorState(state: number): { label: string; variant: "default" | "outline" | "destructive" } {
  switch (state) {
    case 1: return { label: "Online", variant: "default" };
    case 2: return { label: "Offline", variant: "outline" };
    case 3: return { label: "Alarme", variant: "destructive" };
    default: return { label: "\u2014", variant: "outline" };
  }
}

interface VinculadaInfo {
  ucId: string;
  empresaNome: string;
  grupo_tarifario?: string | null;
  subgrupo?: string | null;
  concessionaria_sigla?: string | null;
  modalidade_tarifaria_aneel?: string | null;
}

export function SolisUCTable({
  ucs,
  error,
  vinculadas = {},
}: {
  ucs: UsinaUC[];
  error?: string;
  vinculadas?: Record<string, VinculadaInfo>;
}) {
  const [page, setPage] = useState(0);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (ucs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
        <Radio className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma usina encontrada na Solis.</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(ucs.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const paged = ucs.slice(start, start + PAGE_SIZE);

  const grupoLabels: Record<string, string> = {
    grupo_a: "Grupo A",
    grupo_b: "Grupo B",
    acl: "ACL",
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usina</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Potência (kWp)</TableHead>
              <TableHead>Inversores</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tarifa</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((uc) => {
              const mainInversor = uc.inversores_detalhe?.[0];
              const status = mainInversor
                ? inversorState(mainInversor.state)
                : { label: "\u2014", variant: "outline" as const };
              const vinc = vinculadas[uc.station_id];
              const temTarifa = vinc?.grupo_tarifario;

              return (
                <TableRow key={uc.station_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{uc.station_name}</p>
                        {vinc ? (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <LinkIcon className="h-2.5 w-2.5" />
                            {vinc.empresaNome}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">ID: {uc.station_id}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{parseCity(uc.cidade_uf)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{uc.potencia_instalada_kwp}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{uc.qtd_inversores}x {uc.potencia_inversor_display}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {temTarifa ? (
                      <div className="text-xs">
                        <span className="font-medium">{grupoLabels[vinc.grupo_tarifario!] ?? vinc.grupo_tarifario}</span>
                        {vinc.subgrupo && <span className="text-muted-foreground"> / {vinc.subgrupo}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não configurada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vinc && (
                      <Link
                        href={`/admin/unidades/${vinc.ucId}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                        title="Detalhes da UC"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {start + 1}–{Math.min(start + PAGE_SIZE, ucs.length)} de {ucs.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

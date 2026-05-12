"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, MoreHorizontal, Eye, Power, AlertCircle, Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleUC, arquivarUC } from "@/lib/actions/unidades";

interface UC {
  id: string;
  codigo_uc: string;
  titular: string;
  distribuidora: string;
  potencia_instalada_kwp: number;
  cidade: string | null;
  estado: string | null;
  ativa: boolean;
  arquivada: boolean;
  empresa: { id: string; nome: string }[] | { id: string; nome: string } | null;
  modelo_inversores: string | null;
  data_instalacao: string | null;
  geracao_estimada_mensal_kwh: number | null;
}

const PAGE_SIZE = 25;

function isIncomplete(uc: UC): boolean {
  return (
    !uc.modelo_inversores ||
    !uc.data_instalacao ||
    !uc.geracao_estimada_mensal_kwh
  );
}

export function UCTable({ unidades }: { unidades: UC[] }) {
  const router = useRouter();
  const [page, setPage] = useState(0);

  async function handleToggle(id: string, ativa: boolean) {
    await toggleUC(id, !ativa);
    router.refresh();
  }

  async function handleArchive(id: string, arquivada: boolean) {
    await arquivarUC(id, !arquivada);
    router.refresh();
  }

  if (unidades.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(unidades.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const paged = unidades.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código UC</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Distribuidora</TableHead>
              <TableHead>Potência (kWp)</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((uc) => (
              <TableRow key={uc.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/unidades/${uc.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    <span className="flex items-center gap-1.5">
                      {uc.codigo_uc}
                      {isIncomplete(uc) && (
                        <AlertCircle className="h-3.5 w-3.5 text-warning" />
                      )}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  {Array.isArray(uc.empresa)
                    ? uc.empresa[0]?.nome ?? "—"
                    : uc.empresa?.nome ?? "—"}
                </TableCell>
                <TableCell>{uc.distribuidora}</TableCell>
                <TableCell>{uc.potencia_instalada_kwp}</TableCell>
                <TableCell>
                  {uc.cidade || uc.estado
                    ? [uc.cidade, uc.estado].filter(Boolean).join("/")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={uc.ativa ? "default" : "outline"}>
                    {uc.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/unidades/${uc.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggle(uc.id, uc.ativa)}
                      >
                        <Power className="mr-2 h-4 w-4" />
                        {uc.ativa ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleArchive(uc.id, uc.arquivada)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {uc.arquivada ? "Desarquivar" : "Arquivar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {start + 1}–{Math.min(start + PAGE_SIZE, unidades.length)} de {unidades.length}
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

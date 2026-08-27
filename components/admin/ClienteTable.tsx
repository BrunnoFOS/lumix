"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MoreHorizontal, Eye, Pencil, Archive, Download, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatCNPJ } from "@/lib/utils";
import { arquivarEmpresa, arquivarEmpresasEmLote } from "@/lib/actions/empresas";
import { exportToCSV } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { useRowSelection } from "@/hooks/use-row-selection";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
  ativa: boolean;
  arquivada: boolean;
}

export function ClienteTable({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const {
    selectedIds,
    toggle,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount,
  } = useRowSelection(empresas);

  async function handleArchive(id: string, arquivada: boolean) {
    await arquivarEmpresa(id, !arquivada);
    router.refresh();
  }

  function handleExport() {
    exportToCSV("empresas", ["Nome", "CNPJ", "Cidade", "UF", "Status"], empresas.map((e) => [
      e.nome, formatCNPJ(e.cnpj), e.cidade, e.estado,
      e.arquivada ? "Arquivada" : "Ativa",
    ]));
  }

  async function handleBulkArchive(arquivada: boolean) {
    setProcessing(true);
    const ids = Array.from(selectedIds);
    const result = await arquivarEmpresasEmLote(ids, arquivada);

    if (result.failed.length === 0) {
      toast.success(`${result.succeeded.length} cliente(s) ${arquivada ? "arquivado(s)" : "desarquivado(s)"}.`);
    } else if (result.succeeded.length === 0) {
      toast.error(`Nenhum cliente foi ${arquivada ? "arquivado" : "desarquivado"}.`);
    } else {
      toast.warning(`${result.succeeded.length} ${arquivada ? "arquivado(s)" : "desarquivado(s)"}. ${result.failed.length} falha(s).`);
    }

    clearSelection();
    setProcessing(false);
    router.refresh();
  }

  if (empresas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <Building2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum cliente encontrado.
        </p>
      </div>
    );
  }

  const hasArquivados = Array.from(selectedIds).some((id) => empresas.find((e) => e.id === id)?.arquivada);
  const hasNaoArquivados = Array.from(selectedIds).some((id) => !empresas.find((e) => e.id === id)?.arquivada);

  const bulkActions = [];
  if (hasNaoArquivados) {
    bulkActions.push({
      label: "Arquivar",
      icon: <Archive className="mr-2 h-4 w-4" />,
      onClick: () => handleBulkArchive(true),
    });
  }
  if (hasArquivados) {
    bulkActions.push({
      label: "Desarquivar",
      icon: <ArchiveRestore className="mr-2 h-4 w-4" />,
      onClick: () => handleBulkArchive(false),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <BulkActionBar
        selectedCount={selectedCount}
        onClear={clearSelection}
        actions={bulkActions}
        processing={processing}
      />
      <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow key={empresa.id} data-state={isSelected(empresa.id) ? "selected" : undefined}>
              <TableCell>
                <Checkbox
                  checked={isSelected(empresa.id)}
                  onCheckedChange={() => toggle(empresa.id)}
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link
                  href={`/admin/clientes/${empresa.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {empresa.nome}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatCNPJ(empresa.cnpj)}
              </TableCell>
              <TableCell>
                {empresa.cidade || empresa.estado
                  ? [empresa.cidade, empresa.estado].filter(Boolean).join("/")
                  : "\u2014"}
              </TableCell>
              <TableCell>
                <Badge variant={empresa.arquivada ? "outline" : "default"}>
                  {empresa.arquivada ? "Arquivada" : "Ativa"}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem >
                      <Link href={`/admin/clientes/${empresa.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem >
                      <Link href={`/admin/clientes/${empresa.id}/editar`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchive(empresa.id, empresa.arquivada)}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      {empresa.arquivada ? "Desarquivar" : "Arquivar"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

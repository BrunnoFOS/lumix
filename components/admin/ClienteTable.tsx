"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MoreHorizontal, Eye, Pencil, Power, Archive, Download } from "lucide-react";
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
import { formatCNPJ } from "@/lib/utils";
import { toggleEmpresa, arquivarEmpresa } from "@/lib/actions/empresas";
import { exportToCSV } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
  ativa: boolean;
  arquivada: boolean;
  grupo_id: string | null;
}

export function ClienteTable({ empresas }: { empresas: Empresa[] }) {
  const router = useRouter();

  async function handleToggle(id: string, ativa: boolean) {
    await toggleEmpresa(id, !ativa);
    router.refresh();
  }

  async function handleArchive(id: string, arquivada: boolean) {
    await arquivarEmpresa(id, !arquivada);
    router.refresh();
  }

  function handleExport() {
    exportToCSV("empresas", ["Nome", "CNPJ", "Cidade", "UF", "Status"], empresas.map((e) => [
      e.nome, formatCNPJ(e.cnpj), e.cidade, e.estado,
      e.arquivada ? "Arquivada" : e.ativa ? "Ativa" : "Inativa",
    ]));
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
            <TableHead>Nome</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow key={empresa.id}>
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
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={empresa.arquivada ? "outline" : empresa.ativa ? "default" : "secondary"}>
                  {empresa.arquivada ? "Arquivada" : empresa.ativa ? "Ativa" : "Inativa"}
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
                      onClick={() => handleToggle(empresa.id, empresa.ativa)}
                    >
                      <Power className="mr-2 h-4 w-4" />
                      {empresa.ativa ? "Desativar" : "Ativar"}
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

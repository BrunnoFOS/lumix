import Link from "next/link";
import { FileSearch, Download, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMesReferencia, formatCurrency, formatKWh } from "@/lib/utils";
import { getFaturasProcessadas } from "@/lib/actions/faturas-processadas";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  gerado: "default",
  extraido: "secondary",
  extraindo: "outline",
  gerando: "outline",
  erro: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  extraindo: "Extraindo",
  extraido: "Extraído",
  gerando: "Gerando…",
  gerado: "Gerado",
  erro: "Erro",
};

export default async function FaturasProcessadasPage() {
  const faturas = await getFaturasProcessadas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios de Fatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faturas processadas via extração automática. Edite os campos e regere o PDF.
        </p>
      </div>

      {faturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileSearch className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Nenhuma fatura processada
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            As faturas aparecerão aqui após serem processadas pelo sistema de extração.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>UC</TableHead>
                <TableHead>Mês</TableHead>
                <TableHead>Nº Fatura</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Consumo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {faturas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    {f.empresa_nome || "—"}
                  </TableCell>
                  <TableCell>{f.uc?.codigo_uc || "—"}</TableCell>
                  <TableCell className="capitalize">
                    {formatMesReferencia(f.mes_referencia)}
                  </TableCell>
                  <TableCell>{f.numero_fatura || "—"}</TableCell>
                  <TableCell className="text-right">
                    {f.valor_total_fatura_rs != null
                      ? formatCurrency(f.valor_total_fatura_rs)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {f.consumo_total_kwh != null
                      ? formatKWh(f.consumo_total_kwh)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[f.status] || "outline"}>
                      {STATUS_LABELS[f.status] || f.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {f.pdf_relatorio_url && (
                        <a
                          href={f.pdf_relatorio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                          title="Visualizar PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        href={`/admin/faturas-processadas/${f.id}`}
                        className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                        title="Editar e regerar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

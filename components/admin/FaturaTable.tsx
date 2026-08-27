"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Download, Eye, CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatMesReferencia, formatKWh, gerarNomeRelatorio } from "@/lib/utils";
import { deleteFaturasEmLote, confirmarFaturasEmLote, rejeitarFaturasEmLote } from "@/lib/actions/faturas";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { useRowSelection } from "@/hooks/use-row-selection";

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
  mes_referencia: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  processada: "default",
  pendente: "secondary",
  erro: "destructive",
  rejeitada: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  processada: "Processada",
  pendente: "Pendente",
  erro: "Erro",
  rejeitada: "Rejeitada",
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
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkConfirmDialogOpen, setBulkConfirmDialogOpen] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState("");

  const {
    selectedIds,
    toggle,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount,
  } = useRowSelection(faturas);

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
    exportToCSV("faturas", ["Cliente", "UC", "Mes ref.", "Contrato", "Valor faturado", "Consumo kWh", "Status"], faturas.map((f) => [
      f.uc?.empresa?.nome, f.uc?.codigo_uc, f.mes_referencia, f.contrato,
      f.valor_faturado ?? f.valor_total, f.consumo_kwh, f.status,
    ]));
  }

  async function handleBulkConfirm() {
    setProcessing(true);
    const ids = Array.from(selectedIds);
    const result = await confirmarFaturasEmLote(ids);

    if (result.failed.length === 0) {
      toast.success(`${result.succeeded.length} fatura(s) confirmada(s). Relatorios serao gerados automaticamente.`);
    } else if (result.succeeded.length === 0) {
      toast.error(`Nenhuma fatura foi confirmada. ${result.failed[0]?.error ?? ""}`);
    } else {
      toast.warning(`${result.succeeded.length} confirmada(s). ${result.failed.length} falha(s): ${result.failed[0]?.error ?? ""}`);
    }

    setBulkConfirmDialogOpen(false);
    clearSelection();
    setProcessing(false);
    router.refresh();
  }

  async function handleBulkReject() {
    if (!rejectMotivo.trim()) {
      toast.error("Informe o motivo da rejeicao.");
      return;
    }

    setProcessing(true);
    const ids = Array.from(selectedIds);
    const result = await rejeitarFaturasEmLote(ids, rejectMotivo.trim());

    if (result.failed.length === 0) {
      toast.success(`${result.succeeded.length} fatura(s) rejeitada(s).`);
    } else if (result.succeeded.length === 0) {
      toast.error(`Nenhuma fatura foi rejeitada. ${result.failed[0]?.error ?? ""}`);
    } else {
      toast.warning(`${result.succeeded.length} rejeitada(s). ${result.failed.length} falha(s): ${result.failed[0]?.error ?? ""}`);
    }

    setBulkRejectDialogOpen(false);
    setRejectMotivo("");
    clearSelection();
    setProcessing(false);
    router.refresh();
  }

  async function handleBulkDelete() {
    setProcessing(true);
    const ids = Array.from(selectedIds);
    const result = await deleteFaturasEmLote(ids);

    if (result.failed.length === 0) {
      toast.success(`${result.succeeded.length} fatura(s) excluida(s).`);
    } else if (result.succeeded.length === 0) {
      toast.error(`Nenhuma fatura foi excluida. ${result.failed[0]?.error ?? ""}`);
    } else {
      toast.warning(`${result.succeeded.length} excluida(s). ${result.failed.length} falha(s).`);
    }

    setBulkDeleteDialogOpen(false);
    clearSelection();
    setProcessing(false);
    router.refresh();
  }

  const selectedFaturas = faturas.filter((f) => selectedIds.has(f.id));
  const hasPendentes = selectedFaturas.some((f) => f.status === "pendente");

  const bulkActions = [];
  if (hasPendentes) {
    bulkActions.push({
      label: "Confirmar",
      icon: <CheckCircle className="mr-2 h-4 w-4" />,
      onClick: () => setBulkConfirmDialogOpen(true),
      className: "bg-green-600 hover:bg-green-700 text-white",
    });
    bulkActions.push({
      label: "Rejeitar",
      icon: <XCircle className="mr-2 h-4 w-4" />,
      onClick: () => setBulkRejectDialogOpen(true),
      variant: "destructive" as const,
    });
  }
  bulkActions.push({
    label: "Excluir",
    icon: <Trash2 className="mr-2 h-4 w-4" />,
    onClick: () => setBulkDeleteDialogOpen(true),
    variant: "destructive" as const,
  });

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
              <TableHead>Cliente</TableHead>
              <TableHead>UC</TableHead>
              <TableHead>Mes ref.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Relatorio</TableHead>
              <TableHead className="w-24">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faturas.map((fatura) => {
              const key = `${fatura.uc_id}|${fatura.mes_referencia}`;
              const rel = relatorios[key];

              return (
                <TableRow key={fatura.id} data-state={isSelected(fatura.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(fatura.id)}
                      onCheckedChange={() => toggle(fatura.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {fatura.uc?.empresa?.nome || "\u2014"}
                  </TableCell>
                  <TableCell>{fatura.uc?.codigo_uc || "\u2014"}</TableCell>
                  <TableCell className="capitalize">
                    {formatMesReferencia(fatura.mes_referencia)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fatura.valor_faturado !== null
                      ? formatCurrency(fatura.valor_faturado)
                      : fatura.valor_total !== null
                        ? formatCurrency(fatura.valor_total)
                        : "\u2014"}
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
                          <button
                            type="button"
                            onClick={async () => {
                              const nomeArquivo = gerarNomeRelatorio(
                                rel.mes_referencia,
                                rel.tipo_relatorio,
                                fatura.uc?.empresa?.nome || "Cliente"
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
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            title="Baixar relatorio"
                          >
                            <Download className="h-3 w-3" />
                            Baixar
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{"\u2014"}</span>
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

      {/* Dialog de confirmacao em lote */}
      <AlertDialog open={bulkConfirmDialogOpen} onOpenChange={setBulkConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {selectedCount} fatura(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmar processamento de {selectedCount} fatura(s)? Relatorios serao gerados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkConfirm}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar {selectedCount} fatura(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de rejeicao em lote */}
      <AlertDialog open={bulkRejectDialogOpen} onOpenChange={(v) => { setBulkRejectDialogOpen(v); if (!v) setRejectMotivo(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar {selectedCount} fatura(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as faturas selecionadas serao rejeitadas com o mesmo motivo. O cliente podera ver o motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="motivo-rejeicao-lote">Motivo da rejeicao *</Label>
            <Textarea
              id="motivo-rejeicao-lote"
              placeholder="Ex: Imagem ilegivel, fatura do mes errado..."
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleBulkReject}
              disabled={processing || !rejectMotivo.trim()}
              variant="destructive"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rejeitar {selectedCount} fatura(s)
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de exclusao em lote */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedCount} fatura(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente {selectedCount} fatura(s)?
              <br />
              <br />
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir {selectedCount} fatura(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  MoreHorizontal,
  CheckCircle,
  Download,
  Archive,
  Pencil,
  X,
  Upload,
  Loader2,
  ExternalLink,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/export-csv";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatKWh, formatMesReferencia, formatDateTime, formatDate } from "@/lib/utils";
import {
  updateRelatorioStatus,
  arquivarRelatorio,
  updateRelatorioAnexo,
} from "@/lib/actions/relatorios";
import { createClient } from "@/lib/supabase/client";

interface RelatorioRow {
  id: string;
  uc_id: string;
  mes_referencia: string;
  titulo: string;
  geracao_kwh: number | null;
  geracao_estimada_kwh: number | null;
  economia_reais: number | null;
  indice_performance: string | null;
  status_envio: string;
  gerado_por: string;
  tipo_relatorio: string;
  pdf_url: string | null;
  inicio_ciclo: string | null;
  fim_ciclo: string | null;
  created_at: string;
  uc: { id: string; codigo_uc: string } | null;
  empresa: { id: string; nome: string } | null;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  enviado: "default",
  pendente: "secondary",
  erro: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  enviado: "Enviado",
  pendente: "Pendente",
  erro: "Erro",
};

const PERFORMANCE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  bom: "default",
  regular: "secondary",
  ruim: "destructive",
};

const PERFORMANCE_LABELS: Record<string, string> = {
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
};

export function RelatorioTable({
  relatorios,
  faturasProcessadasMap,
}: {
  relatorios: RelatorioRow[];
  faturasProcessadasMap?: Record<string, { id: string; pdf_fatura_url: string | null }>;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleMarcarEnviado(id: string) {
    await updateRelatorioStatus(id, "enviado");
    router.refresh();
  }

  async function handleArquivar(id: string) {
    const result = await arquivarRelatorio(id);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  async function handleFileChange(
    relId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Arquivo muito grande. Máximo: 10MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `relatorios/edit_${relId}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("faturas")
        .upload(fileName, file, { upsert: true });

      if (upErr) {
        setUploadError("Erro no upload. Tente novamente.");
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("faturas")
        .getPublicUrl(fileName);

      const result = await updateRelatorioAnexo(relId, urlData.publicUrl);

      if (result.error) {
        setUploadError(result.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    } catch {
      setUploadError("Erro inesperado.");
    } finally {
      setUploading(false);
    }
  }

  function handleExport() {
    exportToCSV(
      "relatorios",
      [
        "Cliente",
        "UC",
        "Mês ref.",
        "Início ciclo",
        "Fim ciclo",
        "Geração kWh",
        "Economia R$",
        "Performance",
        "Status",
        "Gerado em",
      ],
      relatorios.map((r) => [
        r.empresa?.nome,
        r.uc?.codigo_uc,
        r.mes_referencia,
        r.inicio_ciclo || "",
        r.fim_ciclo || "",
        r.geracao_kwh,
        r.economia_reais,
        r.indice_performance,
        r.status_envio,
        r.created_at ? formatDateTime(r.created_at) : "",
      ])
    );
  }

  if (relatorios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <FileText className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum relatório encontrado.
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
              <TableHead>Cliente</TableHead>
              <TableHead>UC</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Mês ref.</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Geração</TableHead>
              <TableHead className="text-right">Economia</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Envio</TableHead>
              <TableHead>Gerado em</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {relatorios.map((rel) => {
              const isPendente = rel.status_envio !== "enviado";

              return (
                <TableRow key={rel.id}>
                  <TableCell className="font-medium">
                    {rel.empresa?.nome || "—"}
                  </TableCell>
                  <TableCell>{rel.uc?.codigo_uc || "—"}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="capitalize">
                    {formatMesReferencia(rel.mes_referencia)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {rel.inicio_ciclo && rel.fim_ciclo
                      ? `${formatDate(rel.inicio_ciclo)} a ${formatDate(rel.fim_ciclo)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {rel.geracao_kwh !== null
                      ? formatKWh(rel.geracao_kwh)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {rel.economia_reais !== null
                      ? formatCurrency(rel.economia_reais)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const hasPR = rel.geracao_kwh != null && rel.geracao_estimada_kwh != null && rel.geracao_estimada_kwh > 0;
                      if (!hasPR && !rel.indice_performance) return "—";

                      const pr = hasPR ? (rel.geracao_kwh! / rel.geracao_estimada_kwh!) * 100 : null;
                      const prRounded = pr != null ? Math.round(pr) : null;
                      const classificacao = pr != null
                        ? (pr >= 98 ? "bom" : pr >= 90 ? "regular" : "ruim")
                        : rel.indice_performance;

                      return (
                        <div className="flex flex-col gap-0.5">
                          {prRounded != null && (
                            <span className="text-sm font-medium tabular-nums">
                              PR {prRounded}%
                            </span>
                          )}
                          {classificacao && (
                            <Badge
                              variant={PERFORMANCE_VARIANT[classificacao] || "outline"}
                            >
                              {PERFORMANCE_LABELS[classificacao] || classificacao}
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        STATUS_VARIANT[rel.status_envio] || "outline"
                      }
                    >
                      {STATUS_LABELS[rel.status_envio] || rel.status_envio}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rel.created_at ? formatDateTime(rel.created_at) : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({
                            variant: "ghost",
                            size: "icon",
                          }),
                          "h-8 w-8"
                        )}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rel.pdf_url && (
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(rel.pdf_url!, "_blank")
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver anexo
                          </DropdownMenuItem>
                        )}
                        {(() => {
                          const fpKey = `${rel.uc_id}|${rel.mes_referencia}`;
                          const fp = faturasProcessadasMap?.[fpKey];
                          if (!fp?.pdf_fatura_url) return null;
                          return (
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(fp.pdf_fatura_url!, "_blank")
                              }
                            >
                              <FileSearch className="mr-2 h-4 w-4" />
                              Ver fatura original
                            </DropdownMenuItem>
                          );
                        })()}
                        {isPendente && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setEditingId(rel.id)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar fatura
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMarcarEnviado(rel.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Marcar como enviado
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleArquivar(rel.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de edição de fatura */}
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            setUploadError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Substituir anexo da fatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uploadError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {uploadError}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Selecione um novo arquivo para substituir o anexo atual.
            </p>
            <div className="flex items-center gap-3">
              <label
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "cursor-pointer"
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar arquivo
                  </>
                )}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    if (editingId) handleFileChange(editingId, e);
                  }}
                />
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setUploadError(null);
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou PDF — máx. 10MB
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

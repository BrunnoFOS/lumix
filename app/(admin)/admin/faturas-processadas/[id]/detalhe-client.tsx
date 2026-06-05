"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatKWh, formatMesReferencia, formatDate } from "@/lib/utils";
import { FaturaProcessadaEditForm } from "@/components/admin/FaturaProcessadaEditForm";

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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

interface Props {
  fatura: {
    id: string;
    mes_referencia: string;
    status: string;
    pdf_fatura_url: string | null;
    pdf_relatorio_url: string | null;
    observacao: string | null;
    ultima_edicao_at: string | null;
    consumo_total_kwh: number | null;
    consumo_ponta_kwh: number | null;
    consumo_fora_ponta_kwh: number | null;
    energia_injetada_kwh: number | null;
    consumo_injetado_mesma_uc_kwh: number | null;
    consumo_injetado_outra_uc_kwh: number | null;
    credito_acumulado_kwh: number | null;
    valor_total_fatura_rs: number | null;
    vto_ci_rs: number | null;
    tem_geracao_compartilhada: boolean;
    evidencia_geracao_compartilhada: string | null;
    data_vencimento: string | null;
    numero_fatura: string | null;
  };
  ucCodigo: string;
  empresaNome: string;
  isGrupoA: boolean;
  adminId: string;
}

export function FaturaProcessadaDetalhe({
  fatura,
  ucCodigo,
  empresaNome,
  isGrupoA,
  adminId,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const isBlocked = fatura.status === "gerando" || fatura.status === "extraindo";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/faturas-processadas"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground capitalize">
            Rel. Fatura — {formatMesReferencia(fatura.mes_referencia)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {empresaNome} — UC {ucCodigo}
          </p>
        </div>
        <Badge
          variant={STATUS_VARIANT[fatura.status] || "outline"}
          className="text-sm px-3 py-1"
        >
          {STATUS_LABELS[fatura.status] || fatura.status}
        </Badge>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        {fatura.pdf_relatorio_url && (
          <a href={fatura.pdf_relatorio_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Visualizar relatório
            </Button>
          </a>
        )}
        {fatura.pdf_fatura_url && (
          <a href={fatura.pdf_fatura_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Fatura original
            </Button>
          </a>
        )}
        <Button onClick={() => setEditOpen(true)} disabled={isBlocked}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar e regerar
        </Button>
      </div>

      {/* Dados extraídos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consumo</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Consumo total"
              value={fatura.consumo_total_kwh != null ? formatKWh(fatura.consumo_total_kwh) : null}
            />
            {isGrupoA && (
              <>
                <InfoRow
                  label="Consumo ponta"
                  value={fatura.consumo_ponta_kwh != null ? formatKWh(fatura.consumo_ponta_kwh) : null}
                />
                <InfoRow
                  label="Consumo fora ponta"
                  value={fatura.consumo_fora_ponta_kwh != null ? formatKWh(fatura.consumo_fora_ponta_kwh) : null}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Geração e créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Energia injetada"
              value={fatura.energia_injetada_kwh != null ? formatKWh(fatura.energia_injetada_kwh) : null}
            />
            <InfoRow
              label="Injetado mesma UC"
              value={fatura.consumo_injetado_mesma_uc_kwh != null ? formatKWh(fatura.consumo_injetado_mesma_uc_kwh) : null}
            />
            <InfoRow
              label="Injetado outra UC"
              value={fatura.consumo_injetado_outra_uc_kwh != null ? formatKWh(fatura.consumo_injetado_outra_uc_kwh) : null}
            />
            <InfoRow
              label="Crédito acumulado"
              value={fatura.credito_acumulado_kwh != null ? formatKWh(fatura.credito_acumulado_kwh) : null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valores e dados</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Valor total"
              value={fatura.valor_total_fatura_rs != null ? formatCurrency(fatura.valor_total_fatura_rs) : null}
            />
            <InfoRow
              label="VTO.CI"
              value={fatura.vto_ci_rs != null ? formatCurrency(fatura.vto_ci_rs) : null}
            />
            <InfoRow label="Nº fatura" value={fatura.numero_fatura} />
            <InfoRow
              label="Vencimento"
              value={fatura.data_vencimento ? formatDate(fatura.data_vencimento) : null}
            />
            <InfoRow
              label="Geração compartilhada"
              value={fatura.tem_geracao_compartilhada ? "Sim" : "Não"}
            />
          </CardContent>
        </Card>
      </div>

      {fatura.observacao && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{fatura.observacao}</p>
          </CardContent>
        </Card>
      )}

      {fatura.ultima_edicao_at && (
        <p className="text-xs text-muted-foreground">
          Última edição: {formatDate(fatura.ultima_edicao_at)}
        </p>
      )}

      {/* Modal de edição */}
      <FaturaProcessadaEditForm
        fatura={fatura}
        isGrupoA={isGrupoA}
        adminId={adminId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

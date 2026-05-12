import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { getFatura } from "@/lib/actions/faturas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { formatCurrency, formatKWh, formatMesReferencia, formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  processada: "default",
  pendente: "secondary",
  erro: "destructive",
};

export default async function FaturaDetalhePage({ params }: Props) {
  const { id } = await params;
  const fatura = await getFatura(id);

  if (!fatura) notFound();

  const uc = fatura.uc as { id: string; codigo_uc: string; titular: string; distribuidora: string; empresa: { id: string; nome: string } | null } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/faturas" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground capitalize">
            Fatura — {formatMesReferencia(fatura.mes_referencia)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {uc?.empresa?.nome} — UC {uc?.codigo_uc}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[fatura.status] || "secondary"} className="text-sm px-3 py-1">
          {fatura.status === "processada" ? "Processada" : fatura.status === "pendente" ? "Pendente" : "Erro"}
        </Badge>
      </div>

      {/* PDF actions */}
      {(fatura.pdf_url || fatura.imagem_url) && (
        <div className="flex gap-3">
          {fatura.pdf_url && (
            <a href={fatura.pdf_url} target="_blank" rel="noopener noreferrer">
              <LinkButton href={fatura.pdf_url} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </LinkButton>
            </a>
          )}
          {fatura.imagem_url && (
            <a href={fatura.imagem_url} target="_blank" rel="noopener noreferrer">
              <LinkButton href={fatura.imagem_url} variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver imagem
              </LinkButton>
            </a>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Identificação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Denominação" value={fatura.denominacao} />
            <InfoRow label="Contrato" value={fatura.contrato} />
            <InfoRow label="Mês referência" value={formatMesReferencia(fatura.mes_referencia)} />
            <InfoRow label="Início do ciclo" value={fatura.inicio_ciclo ? formatDate(fatura.inicio_ciclo) : null} />
            <InfoRow label="Fim do ciclo" value={fatura.fim_ciclo ? formatDate(fatura.fim_ciclo) : null} />
          </CardContent>
        </Card>

        {/* Energia Fora Ponta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Energia Fora Ponta</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Energia faturada" value={fatura.energia_faturada_fp != null ? formatKWh(fatura.energia_faturada_fp) : null} />
            <InfoRow label="Tarifa FP" value={fatura.valor_tarifa_fp != null ? `R$ ${fatura.valor_tarifa_fp.toFixed(6)}/kWh` : null} />
            <InfoRow label="kWh compensado" value={fatura.kwh_compensado_fp != null ? formatKWh(fatura.kwh_compensado_fp) : null} />
            <InfoRow label="Tarifa compensada" value={fatura.tarifa_compensada_fp != null ? `R$ ${fatura.tarifa_compensada_fp.toFixed(6)}/kWh` : null} />
            <InfoRow label="Energia consumida" value={fatura.energia_consumida_fp != null ? formatKWh(fatura.energia_consumida_fp) : null} />
            <InfoRow label="Energia injetada" value={fatura.energia_injetada_fp != null ? formatKWh(fatura.energia_injetada_fp) : null} />
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valores e totais</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Valor faturado" value={fatura.valor_faturado != null ? formatCurrency(fatura.valor_faturado) : null} />
            <InfoRow label="Valor total" value={fatura.valor_total != null ? formatCurrency(fatura.valor_total) : null} />
            <InfoRow label="Consumo" value={fatura.consumo_kwh != null ? formatKWh(fatura.consumo_kwh) : null} />
            <InfoRow label="Energia injetada" value={fatura.energia_injetada_kwh != null ? formatKWh(fatura.energia_injetada_kwh) : null} />
            <InfoRow label="Créditos energia" value={fatura.creditos_energia_kwh != null ? formatKWh(fatura.creditos_energia_kwh) : null} />
            <InfoRow label="Economia estimada" value={fatura.economia_estimada != null ? formatCurrency(fatura.economia_estimada) : null} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

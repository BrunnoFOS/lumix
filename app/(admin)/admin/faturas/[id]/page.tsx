import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileSearch, AlertTriangle } from "lucide-react";
import { getFatura, getFaturaLog } from "@/lib/actions/faturas";
import { getFaturasProcessadasByUc } from "@/lib/actions/faturas-processadas";
import { createServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { formatMesReferencia } from "@/lib/utils";
import { FaturaDetail } from "@/components/admin/FaturaDetail";
import { FaturaEditLog } from "@/components/admin/FaturaEditLog";
import { FaturaDeleteButton } from "@/components/admin/FaturaDeleteButton";
import { FaturaConfirmButton } from "@/components/admin/FaturaConfirmButton";
import { FaturaRejectButton } from "@/components/admin/FaturaRejectButton";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
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

export default async function FaturaDetalhePage({ params }: Props) {
  const { id } = await params;
  const fatura = await getFatura(id);

  if (!fatura) notFound();

  const supabase = await createServerClient();

  const [faturaProcessada, log, ucStationResult] = await Promise.all([
    getFaturasProcessadasByUc(fatura.uc_id, fatura.mes_referencia),
    getFaturaLog(id),
    supabase
      .from("unidades_consumidoras")
      .select("station_id")
      .eq("id", fatura.uc_id)
      .single(),
  ]);

  const stationId = ucStationResult.data?.station_id ?? null;

  const uc = fatura.uc as { id: string; codigo_uc: string; titular: string; distribuidora: string; empresa: { id: string; nome: string } | null } | null;
  const uploader = fatura.uploader as { id: string; role: string } | null;
  const isPendenteCliente = fatura.status === "pendente" && uploader?.role === "cliente";
  const mesRef = formatMesReferencia(fatura.mes_referencia);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/faturas" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground capitalize">
            Fatura — {mesRef}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {uc?.empresa?.nome} — UC {uc?.codigo_uc}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[fatura.status] || "secondary"} className="text-sm px-3 py-1">
          {STATUS_LABELS[fatura.status] || fatura.status}
        </Badge>
      </div>

      {/* Rejection callout */}
      {fatura.status === "rejeitada" && fatura.motivo_rejeicao && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Fatura rejeitada</p>
            <p className="mt-1 text-sm text-muted-foreground">{fatura.motivo_rejeicao}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
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
          {faturaProcessada && (
            <LinkButton href={`/admin/faturas-processadas/${faturaProcessada.id}`} variant="outline">
              <FileSearch className="mr-2 h-4 w-4" />
              Ver dados extraídos
            </LinkButton>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isPendenteCliente && (
            <>
              <FaturaConfirmButton
                faturaId={fatura.id}
                ucCodigo={uc?.codigo_uc ?? ""}
                mesReferencia={mesRef}
                mesReferenciaRaw={fatura.mes_referencia}
                stationId={stationId}
              />
              <FaturaRejectButton
                faturaId={fatura.id}
                ucCodigo={uc?.codigo_uc ?? ""}
                mesReferencia={mesRef}
              />
            </>
          )}
          <FaturaDeleteButton
            faturaId={fatura.id}
            ucCodigo={uc?.codigo_uc ?? ""}
            mesReferencia={mesRef}
          />
        </div>
      </div>

      <FaturaDetail fatura={fatura} />

      <FaturaEditLog log={log} />
    </div>
  );
}

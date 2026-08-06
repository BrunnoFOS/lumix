import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getFaturaProcessada, getFaturaProcessadaLog } from "@/lib/actions/faturas-processadas";
import { FaturaProcessadaDetail } from "@/components/admin/FaturaProcessadaDetail";
import { FaturaProcessadaEditLog } from "@/components/admin/FaturaProcessadaEditLog";
import { FaturaProcessadaPDFLayout } from "@/components/admin/FaturaProcessadaPDFLayout";
import { RegenerarRelatorioButton } from "@/components/admin/RegenerarRelatorioButton";
import { formatMesReferencia } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  extraindo: { label: "Extraindo", variant: "secondary" },
  extraido: { label: "Extraído", variant: "secondary" },
  gerando: { label: "Gerando relatório", variant: "secondary" },
  gerado: { label: "Gerado", variant: "default" },
  erro: { label: "Erro", variant: "destructive" },
};

export default async function FaturaProcessadaDetalhePage({ params }: Props) {
  const { id } = await params;

  const [fp, log] = await Promise.all([
    getFaturaProcessada(id),
    getFaturaProcessadaLog(id),
  ]);

  if (!fp) notFound();

  const uc = fp.uc as { id: string; codigo_uc: string; titular: string; empresa: { id: string; nome: string } | null } | null;
  const statusInfo = STATUS_MAP[fp.status] ?? { label: fp.status, variant: "secondary" as const };

  const detailContent = (
    <>
      <FaturaProcessadaDetail fp={fp} editLog={log} />
      <FaturaProcessadaEditLog log={log} />
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/faturas" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground capitalize">
            Dados extraídos — {formatMesReferencia(fp.mes_referencia)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {uc?.empresa?.nome} — UC {uc?.codigo_uc}
          </p>
        </div>
        <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
          {statusInfo.label}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        {fp.pdf_fatura_url && (
          <a href={fp.pdf_fatura_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
            <Download className="h-4 w-4" />
            Fatura original
          </a>
        )}
        {fp.pdf_relatorio_url && (
          <a href={fp.pdf_relatorio_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
            <FileText className="h-4 w-4" />
            Relatório gerado
          </a>
        )}
        <RegenerarRelatorioButton fpId={fp.id} status={fp.status} />
      </div>

      {fp.pdf_fatura_url ? (
        <FaturaProcessadaPDFLayout pdfUrl={fp.pdf_fatura_url}>
          {detailContent}
        </FaturaProcessadaPDFLayout>
      ) : (
        detailContent
      )}
    </div>
  );
}

"use client";

import { RelatorioTable } from "@/components/admin/RelatorioTable";

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
  created_at: string;
  arquivado: boolean;
  uc: { id: string; codigo_uc: string } | null;
  empresa: { id: string; nome: string } | null;
}

export function RelatorioPageClient({
  relatorios,
  faturasProcessadasMap,
}: {
  relatorios: RelatorioRow[];
  faturasProcessadasMap?: Record<string, { id: string; pdf_fatura_url: string | null }>;
}) {
  return (
    <RelatorioTable relatorios={relatorios} faturasProcessadasMap={faturasProcessadasMap} />
  );
}

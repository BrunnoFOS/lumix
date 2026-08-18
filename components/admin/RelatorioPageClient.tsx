"use client";

import { useState, useCallback } from "react";
import { Plus, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RelatorioTable } from "@/components/admin/RelatorioTable";
import { GerarRelatorioForm } from "@/components/admin/GerarRelatorioForm";
import { useFaturaProcessamento } from "@/hooks/use-fatura-processamento";

interface UC {
  id: string;
  codigo_uc: string;
  empresa: { id: string; nome: string } | null;
  source?: "database" | "solis";
  station_name?: string;
}

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
  uc: { id: string; codigo_uc: string } | null;
  empresa: { id: string; nome: string } | null;
}

export function RelatorioPageClient({
  relatorios,
  ucs,
  faturasProcessadasMap,
}: {
  relatorios: RelatorioRow[];
  ucs: UC[];
  faturasProcessadasMap?: Record<string, { id: string; pdf_fatura_url: string | null }>;
}) {
  const [showForm, setShowForm] = useState(false);
  const { status: processingStatus, start: startPolling, dismiss } = useFaturaProcessamento();

  const handleSuccess = useCallback(
    (info: { uc_id: string; mes_referencia: string }) => {
      setShowForm(false);
      startPolling(info.uc_id, info.mes_referencia);
    },
    [startPolling]
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <>
      {processingStatus === "polling" && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-orange-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Relatório em processamento
            </p>
            <p className="text-xs text-orange-600">
              Aguardando geração automática. Você será notificado quando concluir.
            </p>
          </div>
        </div>
      )}

      {processingStatus === "success" && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="flex-1 text-sm font-medium text-emerald-800">
            Relatório gerado com sucesso! A lista foi atualizada.
          </p>
          <button
            onClick={dismiss}
            className="shrink-0 rounded p-1 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {processingStatus === "timeout" && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Tempo limite excedido
            </p>
            <p className="text-xs text-red-600">
              O relatório não foi gerado em 5 minutos. Verifique o processamento ou tente novamente.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Anexar fatura
          </Button>
        </div>
      )}

      {showForm && (
        <GerarRelatorioForm
          ucs={ucs}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}

      <RelatorioTable relatorios={relatorios} faturasProcessadasMap={faturasProcessadasMap} />
    </>
  );
}

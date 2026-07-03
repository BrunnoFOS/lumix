"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RelatorioTable } from "@/components/admin/RelatorioTable";
import { GerarRelatorioForm } from "@/components/admin/GerarRelatorioForm";

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
  inicio_ciclo: string | null;
  fim_ciclo: string | null;
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
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const handleSuccess = useCallback(() => {
    setShowForm(false);
    toast.success("Relatório enviado para geração com sucesso!", {
      description: "A página será atualizada em instantes.",
    });
    setTimeout(() => {
      router.refresh();
    }, 5000);
  }, [router]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <>
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

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  mes_referencia: string;
  titulo: string;
  geracao_kwh: number | null;
  geracao_estimada_kwh: number | null;
  economia_reais: number | null;
  indice_performance: string | null;
  status_envio: string;
  gerado_por: string;
  pdf_url: string | null;
  uc: { id: string; codigo_uc: string } | null;
  empresa: { id: string; nome: string } | null;
}

export function RelatorioPageClient({
  relatorios,
  ucs,
}: {
  relatorios: RelatorioRow[];
  ucs: UC[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const handleSuccess = useCallback(() => {
    setShowForm(false);
    router.refresh();
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

      <RelatorioTable relatorios={relatorios} />
    </>
  );
}

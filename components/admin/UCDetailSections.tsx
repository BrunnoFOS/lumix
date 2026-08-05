"use client";

import { useRef, useState, useCallback } from "react";
import { Loader2, Save } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UCEndereco } from "@/components/admin/UCEndereco";
import { UCClassificacaoTarifaria } from "@/components/admin/UCClassificacaoTarifaria";
import { UCParametrosEstimativa } from "@/components/admin/UCParametrosEstimativa";
import type { UCSectionHandle } from "@/types/uc-section";
import type { TarifaOpcoes } from "@/lib/actions/tarifas-aneel";

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const missing = value === null || value === undefined || value === "";
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      {missing ? (
        <span className="flex items-center gap-1 text-sm text-warning">
          <AlertCircle className="h-3.5 w-3.5" />
          Não informado
        </span>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}

interface UCDetailSectionsProps {
  ucId: string;
  ucData: {
    codigo_uc: string;
    titular: string;
    distribuidora: string | null;
    enquadramento_tarifario: string;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    grupo_tarifario: string | null;
    subgrupo: string | null;
    concessionaria_sigla: string | null;
    modalidade_tarifaria_aneel: string | null;
    contrato_acl_rs_mwh: number | null;
    icms_aliquota: number | null;
    pis_aliquota: number | null;
    cofins_aliquota: number | null;
    data_inicio_degradacao: string | null;
    fator_rendimento: number | null;
    degradacao_ano_zero: number | null;
    degradacao_anos_seguintes: number | null;
  };
  opcoesTarifarias: TarifaOpcoes;
}

const enquadramentoLabels: Record<string, string> = {
  monofasico: "Monofásico",
  bifasico: "Bifásico",
  trifasico: "Trifásico",
};

export function UCDetailSections({ ucId, ucData, opcoesTarifarias }: UCDetailSectionsProps) {
  const enderecoRef = useRef<UCSectionHandle>(null);
  const tarifaRef = useRef<UCSectionHandle>(null);
  const estimativaRef = useRef<UCSectionHandle>(null);

  const [savingAll, setSavingAll] = useState(false);
  // Force re-render when children change status
  const [, setTick] = useState(0);
  const notifyChange = useCallback(() => setTick((t) => t + 1), []);

  const anyChanges =
    enderecoRef.current?.hasChanges ||
    tarifaRef.current?.hasChanges ||
    estimativaRef.current?.hasChanges;

  async function handleSaveAll() {
    setSavingAll(true);
    try {
      const promises: Promise<void>[] = [];
      if (enderecoRef.current?.hasChanges) promises.push(enderecoRef.current.save());
      if (tarifaRef.current?.hasChanges) promises.push(tarifaRef.current.save());
      if (estimativaRef.current?.hasChanges) promises.push(estimativaRef.current.save());
      await Promise.all(promises);
      toast.success("Todas as alterações foram salvas!");
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          disabled={!anyChanges || savingAll}
          onClick={handleSaveAll}
        >
          {savingAll ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar tudo
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da UC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Código UC" value={ucData.codigo_uc} />
            <DetailRow label="Titular" value={ucData.titular} />
            <DetailRow label="Distribuidora" value={ucData.distribuidora} />
            <DetailRow label="Enquadramento" value={enquadramentoLabels[ucData.enquadramento_tarifario]} />
          </CardContent>
        </Card>

        <UCEndereco
          ref={enderecoRef}
          ucId={ucId}
          initial={{
            endereco: ucData.endereco,
            cidade: ucData.cidade,
            estado: ucData.estado,
          }}
          onChangeStatus={notifyChange}
        />
      </div>

      <UCClassificacaoTarifaria
        ref={tarifaRef}
        ucId={ucId}
        initial={{
          grupo_tarifario: ucData.grupo_tarifario,
          subgrupo: ucData.subgrupo,
          concessionaria_sigla: ucData.concessionaria_sigla,
          modalidade_tarifaria_aneel: ucData.modalidade_tarifaria_aneel,
          contrato_acl_rs_mwh: ucData.contrato_acl_rs_mwh,
          icms_aliquota: ucData.icms_aliquota,
          pis_aliquota: ucData.pis_aliquota,
          cofins_aliquota: ucData.cofins_aliquota,
        }}
        opcoesTarifarias={opcoesTarifarias}
        onChangeStatus={notifyChange}
      />

      <UCParametrosEstimativa
        ref={estimativaRef}
        ucId={ucId}
        initial={{
          data_inicio_degradacao: ucData.data_inicio_degradacao,
          fator_rendimento: ucData.fator_rendimento,
          degradacao_ano_zero: ucData.degradacao_ano_zero,
          degradacao_anos_seguintes: ucData.degradacao_anos_seguintes,
        }}
        onChangeStatus={notifyChange}
      />
    </>
  );
}

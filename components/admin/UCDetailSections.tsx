"use client";

import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UCEndereco } from "@/components/admin/UCEndereco";
import { UCClassificacaoTarifaria } from "@/components/admin/UCClassificacaoTarifaria";
import { UCParametrosEstimativa } from "@/components/admin/UCParametrosEstimativa";
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
  return (
    <>
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
          ucId={ucId}
          initial={{
            endereco: ucData.endereco,
            cidade: ucData.cidade,
            estado: ucData.estado,
          }}
        />
      </div>

      <UCClassificacaoTarifaria
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
      />

      <UCParametrosEstimativa
        ucId={ucId}
        initial={{
          data_inicio_degradacao: ucData.data_inicio_degradacao,
          fator_rendimento: ucData.fator_rendimento,
          degradacao_ano_zero: ucData.degradacao_ano_zero,
          degradacao_anos_seguintes: ucData.degradacao_anos_seguintes,
        }}
      />
    </>
  );
}

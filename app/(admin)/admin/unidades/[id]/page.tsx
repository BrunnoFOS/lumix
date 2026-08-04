import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UCDetailSections } from "@/components/admin/UCDetailSections";
import { getUC } from "@/lib/actions/unidades";
import { getOpcoesTarifarias } from "@/lib/actions/tarifas-aneel";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const missing = value === null || value === undefined || value === "";
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      {missing ? (
        <span className="flex items-center gap-1 text-sm text-warning">
          N\u00e3o informado
        </span>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}

export default async function UCDetalhesPage({ params }: Props) {
  const { id } = await params;
  const [uc, opcoesTarifarias] = await Promise.all([
    getUC(id),
    getOpcoesTarifarias(),
  ]);

  if (!uc) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LinkButton variant="ghost" size="icon" href="/admin/unidades">
            <ArrowLeft className="h-4 w-4" />
          </LinkButton>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{uc.codigo_uc}</h1>
              <Badge variant={uc.ativa ? "default" : "outline"}>
                {uc.ativa ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {uc.titular} \u2014{" "}
              <Link
                href={`/admin/clientes/${uc.empresa?.id}`}
                className="text-primary hover:underline"
              >
                {uc.empresa?.nome}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <UCDetailSections
        ucId={id}
        ucData={{
          codigo_uc: uc.codigo_uc,
          titular: uc.titular,
          distribuidora: uc.distribuidora ?? null,
          enquadramento_tarifario: uc.enquadramento_tarifario,
          endereco: uc.endereco ?? null,
          cidade: uc.cidade ?? null,
          estado: uc.estado ?? null,
          grupo_tarifario: uc.grupo_tarifario ?? null,
          subgrupo: uc.subgrupo ?? null,
          concessionaria_sigla: uc.concessionaria_sigla ?? null,
          modalidade_tarifaria_aneel: uc.modalidade_tarifaria_aneel ?? null,
          contrato_acl_rs_mwh: uc.contrato_acl_rs_mwh ?? null,
          icms_aliquota: uc.icms_aliquota ?? null,
          pis_aliquota: uc.pis_aliquota ?? null,
          cofins_aliquota: uc.cofins_aliquota ?? null,
          data_inicio_degradacao: uc.data_inicio_degradacao ?? null,
          fator_rendimento: uc.fator_rendimento ?? null,
          degradacao_ano_zero: uc.degradacao_ano_zero ?? null,
          degradacao_anos_seguintes: uc.degradacao_anos_seguintes ?? null,
        }}
        opcoesTarifarias={opcoesTarifarias}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados t\u00e9cnicos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <DetailRow label="Pot\u00eancia instalada" value={uc.potencia_instalada_kwp ? `${uc.potencia_instalada_kwp} kWp` : null} />
            <DetailRow label="Qtd. inversores" value={uc.quantidade_inversores} />
            <DetailRow label="Modelo inversores" value={uc.modelo_inversores} />
          </div>
          <div className="space-y-3">
            <DetailRow label="Pot\u00eancia inversor" value={uc.potencia_inversor_kw ? `${uc.potencia_inversor_kw} kW` : null} />
            <DetailRow label="Data instala\u00e7\u00e3o" value={uc.data_instalacao ? formatDate(uc.data_instalacao) : null} />
            <DetailRow label="Gera\u00e7\u00e3o estimada" value={uc.geracao_estimada_mensal_kwh ? `${uc.geracao_estimada_mensal_kwh} kWh/m\u00eas` : null} />
          </div>
        </CardContent>
      </Card>

      {uc.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observa\u00e7\u00f5es</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{uc.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

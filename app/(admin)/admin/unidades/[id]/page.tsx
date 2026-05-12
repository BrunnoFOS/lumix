import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UCClassificacaoTarifaria } from "@/components/admin/UCClassificacaoTarifaria";
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
          <AlertCircle className="h-3.5 w-3.5" />
          Não informado
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

  const enquadramentoLabels: Record<string, string> = {
    monofasico: "Monofásico",
    bifasico: "Bifásico",
    trifasico: "Trifásico",
  };

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
              {uc.titular} —{" "}
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da UC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Código UC" value={uc.codigo_uc} />
            <DetailRow label="Titular" value={uc.titular} />
            <DetailRow label="Distribuidora" value={uc.distribuidora} />
            <DetailRow label="Enquadramento" value={enquadramentoLabels[uc.enquadramento_tarifario]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Endereço" value={uc.endereco} />
            <DetailRow label="Cidade/UF" value={
              uc.cidade || uc.estado ? [uc.cidade, uc.estado].filter(Boolean).join("/") : null
            } />
          </CardContent>
        </Card>
      </div>

      <UCClassificacaoTarifaria
        ucId={id}
        initial={{
          grupo_tarifario: uc.grupo_tarifario ?? null,
          subgrupo: uc.subgrupo ?? null,
          concessionaria_sigla: uc.concessionaria_sigla ?? null,
          modalidade_tarifaria_aneel: uc.modalidade_tarifaria_aneel ?? null,
        }}
        opcoesTarifarias={opcoesTarifarias}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados técnicos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <DetailRow label="Potência instalada" value={uc.potencia_instalada_kwp ? `${uc.potencia_instalada_kwp} kWp` : null} />
            <DetailRow label="Qtd. inversores" value={uc.quantidade_inversores} />
            <DetailRow label="Modelo inversores" value={uc.modelo_inversores} />
          </div>
          <div className="space-y-3">
            <DetailRow label="Potência inversor" value={uc.potencia_inversor_kw ? `${uc.potencia_inversor_kw} kW` : null} />
            <DetailRow label="Data instalação" value={uc.data_instalacao ? formatDate(uc.data_instalacao) : null} />
            <DetailRow label="Geração estimada" value={uc.geracao_estimada_mensal_kwh ? `${uc.geracao_estimada_mensal_kwh} kWh/mês` : null} />
          </div>
        </CardContent>
      </Card>

      {uc.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{uc.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatKWh } from "@/lib/utils";
import {
  Zap,
  MapPin,
  Calendar,
  Settings,
  BarChart3,
} from "lucide-react";

interface UCData {
  id: string;
  codigo_uc: string;
  titular: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  distribuidora: string;
  enquadramento_tarifario: string;
  modalidade_tarifaria: string;
  potencia_instalada_kwp: number;
  quantidade_inversores: number;
  modelo_inversores: string | null;
  potencia_inversor_kw: number | null;
  data_instalacao: string | null;
  geracao_estimada_mensal_kwh: number | null;
  observacoes: string | null;
}

const ENQUADRAMENTO_LABELS: Record<string, string> = {
  monofasico: "Monofásico",
  bifasico: "Bifásico",
  trifasico: "Trifásico",
};

const MODALIDADE_LABELS: Record<string, string> = {
  convencional: "Convencional",
  branca: "Branca",
  verde: "Verde",
  azul: "Azul",
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export function UsinaDetails({ ucs }: { ucs: UCData[] }) {
  if (ucs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Zap className="h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
          Nenhuma usina cadastrada
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre em contato com a equipe Lumix para cadastrar sua usina.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ucs.map((uc) => (
        <div key={uc.id} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              UC {uc.codigo_uc}
            </h2>
            <Badge variant="outline">{uc.distribuidora}</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Dados cadastrais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  Dados cadastrais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Titular" value={uc.titular} />
                <InfoRow label="Código UC" value={uc.codigo_uc} />
                <InfoRow label="Distribuidora" value={uc.distribuidora} />
                <InfoRow
                  label="Endereço"
                  value={
                    [uc.endereco, uc.cidade, uc.estado].filter(Boolean).join(", ") || null
                  }
                />
                <InfoRow
                  label="Enquadramento"
                  value={ENQUADRAMENTO_LABELS[uc.enquadramento_tarifario]}
                />
                <InfoRow
                  label="Modalidade"
                  value={MODALIDADE_LABELS[uc.modalidade_tarifaria]}
                />
              </CardContent>
            </Card>

            {/* Dados técnicos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4 text-primary" />
                  Equipamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow
                  label="Potência instalada"
                  value={`${uc.potencia_instalada_kwp} kWp`}
                />
                <InfoRow
                  label="Inversores"
                  value={`${uc.quantidade_inversores}${uc.modelo_inversores ? ` × ${uc.modelo_inversores}` : ""}`}
                />
                {uc.potencia_inversor_kw && (
                  <InfoRow
                    label="Potência por inversor"
                    value={`${uc.potencia_inversor_kw} kW`}
                  />
                )}
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Geração
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow
                  label="Estimativa mensal"
                  value={
                    uc.geracao_estimada_mensal_kwh
                      ? formatKWh(uc.geracao_estimada_mensal_kwh)
                      : null
                  }
                />
                <InfoRow
                  label="Data de instalação"
                  value={uc.data_instalacao ? formatDate(uc.data_instalacao) : null}
                />
                {uc.observacoes && (
                  <div className="mt-3 rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{uc.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
}

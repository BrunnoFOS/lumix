import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatKWh } from "@/lib/utils";
import {
  Zap,
  MapPin,
  Calendar,
  Settings,
  BarChart3,
  Cpu,
  SunMedium,
} from "lucide-react";
import type { InversorDetalhe, UCInversores } from "@/lib/actions/dados-geracao";

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
  quantidade_modulos: number | null;
  modelo_modulos: string | null;
  potencia_modulo_w: number | null;
  quantidade_inversores: number;
  modelo_inversores: string | null;
  potencia_inversor_kw: number | null;
  data_instalacao: string | null;
  geracao_estimada_mensal_kwh: number | null;
  observacoes: string | null;
}

const ENQUADRAMENTO_LABELS: Record<string, string> = {
  monofasico: "Monofasico",
  bifasico: "Bifasico",
  trifasico: "Trifasico",
};

const MODALIDADE_LABELS: Record<string, string> = {
  convencional: "Convencional",
  branca: "Branca",
  verde: "Verde",
  azul: "Azul",
};

function inversorState(state: number): { label: string; variant: "default" | "outline" | "destructive" } {
  switch (state) {
    case 1: return { label: "Online", variant: "default" };
    case 2: return { label: "Offline", variant: "outline" };
    case 3: return { label: "Alarme", variant: "destructive" };
    default: return { label: "—", variant: "outline" };
  }
}

function getUCStatus(inversores: InversorDetalhe[]): { label: string; variant: "default" | "outline" | "destructive" } | null {
  if (inversores.length === 0) return null;

  const allOffline = inversores.every((inv) => inv.state === 2);
  const hasAlarm = inversores.some((inv) => inv.state === 3);
  const allOnline = inversores.every((inv) => inv.state === 1);

  if (hasAlarm) return { label: "Alarme", variant: "destructive" };
  if (allOffline) return { label: "Offline", variant: "outline" };
  if (allOnline) return { label: "Online", variant: "default" };
  return { label: "Parcial", variant: "outline" };
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

interface UsinaDetailsProps {
  ucs: UCData[];
  inversoresData?: UCInversores[];
}

export function UsinaDetails({ ucs, inversoresData = [] }: UsinaDetailsProps) {
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

  // Agrupar inversores por UC (pode ter múltiplas stations por UC)
  const inversoresMap = new Map<string, { inversores: InversorDetalhe[]; synced_at: string | null; provider: string }>();
  for (const item of inversoresData) {
    const existing = inversoresMap.get(item.uc_id);
    if (existing) {
      existing.inversores.push(...item.inversores);
      // Manter synced_at mais recente
      if (item.synced_at && (!existing.synced_at || item.synced_at > existing.synced_at)) {
        existing.synced_at = item.synced_at;
      }
    } else {
      inversoresMap.set(item.uc_id, {
        inversores: [...item.inversores],
        synced_at: item.synced_at,
        provider: item.provider,
      });
    }
  }

  return (
    <div className="space-y-8">
      {ucs.map((uc) => {
        const ucInv = inversoresMap.get(uc.id);
        const inversores = ucInv?.inversores ?? [];
        const ucStatus = getUCStatus(inversores);

        return (
          <div key={uc.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                UC {uc.codigo_uc}
              </h2>
              <Badge variant="outline">{uc.distribuidora}</Badge>
              {ucStatus && (
                <Badge variant={ucStatus.variant}>{ucStatus.label}</Badge>
              )}
              {!ucInv && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  Sem monitoramento
                </Badge>
              )}
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
                  <InfoRow label="Codigo UC" value={uc.codigo_uc} />
                  <InfoRow label="Distribuidora" value={uc.distribuidora} />
                  <InfoRow
                    label="Endereco"
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

              {/* Módulos fotovoltaicos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SunMedium className="h-4 w-4 text-primary" />
                    Modulos fotovoltaicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow
                    label="Potencia instalada"
                    value={`${uc.potencia_instalada_kwp} kWp`}
                  />
                  <InfoRow
                    label="Quantidade"
                    value={uc.quantidade_modulos ? `${uc.quantidade_modulos} modulos` : null}
                  />
                  <InfoRow
                    label="Modelo"
                    value={uc.modelo_modulos}
                  />
                  <InfoRow
                    label="Potencia por modulo"
                    value={uc.potencia_modulo_w ? `${uc.potencia_modulo_w} W` : null}
                  />
                </CardContent>
              </Card>

              {/* Inversores */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="h-4 w-4 text-primary" />
                    Inversores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow
                    label="Quantidade"
                    value={`${uc.quantidade_inversores}`}
                  />
                  <InfoRow
                    label="Modelo"
                    value={uc.modelo_inversores}
                  />
                  {uc.potencia_inversor_kw && (
                    <InfoRow
                      label="Potencia por inversor"
                      value={`${uc.potencia_inversor_kw} kW`}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Geração */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Geracao
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
                    label="Data de instalacao"
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

            {/* Status individual dos inversores */}
            {inversores.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="h-4 w-4 text-primary" />
                    Status dos inversores
                    {ucInv?.synced_at && (
                      <span className="ml-auto text-xs font-normal text-muted-foreground">
                        Atualizado em {formatDate(ucInv.synced_at)}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inversores.map((inv, idx) => {
                      const status = inversorState(inv.state);
                      return (
                        <div
                          key={inv.sn || idx}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {inv.model || inv.product_model || `Inversor ${idx + 1}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              SN: {inv.sn} &middot; {inv.power_kw} kW
                            </span>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}

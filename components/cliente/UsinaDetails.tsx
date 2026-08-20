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
  Building2,
  Gauge,
  Link2,
  WifiOff,
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
  grupo_tarifario: string | null;
  subgrupo: string | null;
  potencia_instalada_kw: number;
  quantidade_modulos: number | null;
  modelo_modulos: string | null;
  potencia_modulo_w: number | null;
  quantidade_inversores: number;
  modelo_inversores: string | null;
  potencia_inversor_kw: number | null;
  data_instalacao: string | null;
  geracao_estimada_mensal_kwh: number | null;
  fator_rendimento: number | null;
  degradacao_ano_zero: number | null;
  degradacao_anos_seguintes: number | null;
  data_inicio_degradacao: string | null;
  observacoes: string | null;
}

interface StationInfo {
  station_id: string;
  provider: string;
  station_name: string;
  cidade_uf: string | null;
  potencia_kw: number;
  qtd_inversores: number;
  modelo_inversores: string[] | null;
  potencia_inversor_kw: number | null;
  synced_at: string | null;
}

interface Totais {
  potencia: number;
  modulos: number;
  inversores: number;
  ucs: number;
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

const GRUPO_LABELS: Record<string, string> = {
  grupo_a: "Grupo A",
  grupo_b: "Grupo B",
  acl: "ACL (Mercado Livre)",
};

const PROVIDER_LABELS: Record<string, string> = {
  solis: "Solis",
  sungrow: "SunGrow",
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
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

interface UsinaDetailsProps {
  ucs: UCData[];
  inversoresData?: UCInversores[];
  stationsData?: Record<string, StationInfo[]>;
  totais?: Totais;
}

export function UsinaDetails({ ucs, inversoresData = [], stationsData = {}, totais }: UsinaDetailsProps) {
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
  const inversoresMap = new Map<string, { inversores: InversorDetalhe[]; synced_at: string | null; providers: string[] }>();
  for (const item of inversoresData) {
    const existing = inversoresMap.get(item.uc_id);
    if (existing) {
      existing.inversores.push(...item.inversores);
      if (!existing.providers.includes(item.provider)) existing.providers.push(item.provider);
      if (item.synced_at && (!existing.synced_at || item.synced_at > existing.synced_at)) {
        existing.synced_at = item.synced_at;
      }
    } else {
      inversoresMap.set(item.uc_id, {
        inversores: [...item.inversores],
        synced_at: item.synced_at,
        providers: [item.provider],
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumo geral */}
      {totais && ucs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-50 p-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Potência total</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {totais.potencia.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kW
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2">
                  <SunMedium className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-sm text-muted-foreground">Módulos</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {totais.modulos.toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground">Inversores</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {totais.inversores.toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm text-muted-foreground">Unidades (UCs)</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {totais.ucs}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de UCs */}
      {ucs.map((uc) => {
        const ucInv = inversoresMap.get(uc.id);
        const inversores = ucInv?.inversores ?? [];
        const ucStatus = getUCStatus(inversores);
        const stations = stationsData[uc.id] ?? [];
        const onlineCount = inversores.filter((i) => i.state === 1).length;
        const offlineCount = inversores.filter((i) => i.state === 2).length;
        const alarmCount = inversores.filter((i) => i.state === 3).length;

        return (
          <div key={uc.id} className="space-y-4">
            {/* Header da UC */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <h2 className="text-lg font-semibold text-foreground">
                UC {uc.codigo_uc}
              </h2>
              <span className="text-sm text-muted-foreground">— {uc.titular}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {uc.distribuidora && (
                  <Badge variant="outline">{uc.distribuidora}</Badge>
                )}
                {ucInv?.providers && ucInv.providers.map((p) => (
                  <Badge key={p} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                    {PROVIDER_LABELS[p] ?? p}
                  </Badge>
                ))}
                {ucStatus && (
                  <Badge variant={ucStatus.variant}>{ucStatus.label}</Badge>
                )}
                {!ucInv && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    Sem monitoramento
                  </Badge>
                )}
              </div>
            </div>

            {/* Cards de informação */}
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
                    value={[uc.endereco, uc.cidade, uc.estado].filter(Boolean).join(", ") || null}
                  />
                </CardContent>
              </Card>

              {/* Classificação tarifária */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4 text-primary" />
                    Classificação tarifária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="Grupo tarifário" value={uc.grupo_tarifario ? GRUPO_LABELS[uc.grupo_tarifario] ?? uc.grupo_tarifario : null} />
                  <InfoRow label="Subgrupo" value={uc.subgrupo} />
                  <InfoRow label="Enquadramento" value={ENQUADRAMENTO_LABELS[uc.enquadramento_tarifario]} />
                  <InfoRow label="Modalidade" value={MODALIDADE_LABELS[uc.modalidade_tarifaria] ?? uc.modalidade_tarifaria} />
                </CardContent>
              </Card>

              {/* Módulos fotovoltaicos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SunMedium className="h-4 w-4 text-primary" />
                    Módulos fotovoltaicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="Potência instalada" value={`${uc.potencia_instalada_kw} kW`} />
                  <InfoRow label="Quantidade" value={uc.quantidade_modulos ? `${uc.quantidade_modulos} módulos` : null} />
                  <InfoRow label="Modelo" value={uc.modelo_modulos} />
                  <InfoRow label="Potência/módulo" value={uc.potencia_modulo_w ? `${uc.potencia_modulo_w} W` : null} />
                </CardContent>
              </Card>

              {/* Inversores (dados cadastrais) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="h-4 w-4 text-primary" />
                    Inversores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="Quantidade" value={`${uc.quantidade_inversores}`} />
                  <InfoRow label="Modelo" value={uc.modelo_inversores} />
                  {uc.potencia_inversor_kw && (
                    <InfoRow label="Potência/inversor" value={`${uc.potencia_inversor_kw} kW`} />
                  )}
                </CardContent>
              </Card>

              {/* Geração e rendimento */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Geração e rendimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow
                    label="Estimativa mensal"
                    value={uc.geracao_estimada_mensal_kwh ? formatKWh(uc.geracao_estimada_mensal_kwh) : null}
                  />
                  <InfoRow
                    label="Data de instalação"
                    value={uc.data_instalacao ? formatDate(uc.data_instalacao) : null}
                  />
                  <InfoRow
                    label="Fator rendimento"
                    value={uc.fator_rendimento != null ? `${(uc.fator_rendimento * 100).toFixed(1)}%` : null}
                  />
                  {uc.degradacao_ano_zero != null && (
                    <InfoRow
                      label="Degradação 1º ano"
                      value={`${(uc.degradacao_ano_zero * 100).toFixed(1)}%`}
                    />
                  )}
                  {uc.degradacao_anos_seguintes != null && (
                    <InfoRow
                      label="Degradação/ano"
                      value={`${(uc.degradacao_anos_seguintes * 100).toFixed(2)}%`}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Vínculos com provedores */}
              {stations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Link2 className="h-4 w-4 text-primary" />
                      Monitoramento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stations.map((st) => (
                      <div key={st.station_id} className="rounded-md border border-border p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{st.station_name || st.station_id}</span>
                          <Badge variant="outline" className="text-xs">
                            {PROVIDER_LABELS[st.provider] ?? st.provider}
                          </Badge>
                        </div>
                        {st.cidade_uf && (
                          <p className="mt-1 text-xs text-muted-foreground">{st.cidade_uf}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {st.potencia_kw > 0 && <span>{st.potencia_kw} kW</span>}
                          {st.qtd_inversores > 0 && <span>{st.qtd_inversores} inv.</span>}
                        </div>
                        {st.synced_at && (
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            Sincronizado: {formatDate(st.synced_at)}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Observações */}
            {uc.observacoes && (
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">{uc.observacoes}</p>
              </div>
            )}

            {/* Status individual dos inversores */}
            {inversores.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="h-4 w-4 text-primary" />
                    Status dos inversores
                    <div className="ml-auto flex items-center gap-2">
                      {onlineCount > 0 && (
                        <span className="text-xs text-emerald-600">{onlineCount} online</span>
                      )}
                      {offlineCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <WifiOff className="h-3 w-3" />
                          {offlineCount} offline
                        </span>
                      )}
                      {alarmCount > 0 && (
                        <span className="text-xs text-red-600">{alarmCount} alarme</span>
                      )}
                      {ucInv?.synced_at && (
                        <span className="text-xs font-normal text-muted-foreground">
                          Atualizado: {formatDate(ucInv.synced_at)}
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {inversores.map((inv, idx) => {
                      const status = inversorState(inv.state);
                      return (
                        <div
                          key={inv.sn || idx}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
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

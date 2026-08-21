"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sun,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Calendar,
  Loader2,
  AlertCircle,
  Zap,
  Target,
  FileText,
  CheckCircle,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
const SolisGeracaoChart = dynamic(
  () => import("@/components/admin/SolisGeracaoChart").then((mod) => ({ default: mod.SolisGeracaoChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full" />,
  }
);

import { fetchGeracaoMensalConsolidada, gerarRelatorioSolis } from "@/lib/actions/solis";
import type { SolisGeracaoMensal as GeracaoData, GerarRelatorioResult } from "@/lib/actions/solis";
import { calcularGeracaoEstimadaUC } from "@/lib/actions/geracao-estimada";
import { classificarDesempenho } from "@/lib/geracao-estimada";
import { updateUCLocalizacao } from "@/lib/actions/unidades";

function formatKwh(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export interface EmpresaOption {
  id: string;
  nome: string;
}

export interface UCComStations {
  ucId: string;
  codigoUc: string;
  empresaId: string;
  empresaNome: string;
  stations: { station_id: string; provider: "solis" | "sungrow" }[];
}

interface Props {
  empresas: EmpresaOption[];
  ucs: UCComStations[];
}

export function SolisGeracaoMensal({ empresas, ucs }: Props) {
  const router = useRouter();
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Default: primeiro e último dia do mês atual
  const defaultInicio = `${mesAtual}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const defaultFim = `${mesAtual}-${String(lastDay).padStart(2, "0")}`;

  const [empresaId, setEmpresaId] = useState("");
  const [ucId, setUcId] = useState("");
  const [dataInicio, setDataInicio] = useState(defaultInicio);
  const [dataFim, setDataFim] = useState(defaultFim);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeracaoData | null>(null);
  const [gerando, setGerando] = useState(false);
  const [geradoOk, setGeradoOk] = useState(false);
  const [gerarError, setGerarError] = useState<string | null>(null);
  const [gerarErrorType, setGerarErrorType] = useState<GerarRelatorioResult["errorType"]>(undefined);
  const [gerarCamposFaltantes, setGerarCamposFaltantes] = useState<string[]>([]);
  const [gerarErrorUcId, setGerarErrorUcId] = useState<string | null>(null);
  const [showLocationEdit, setShowLocationEdit] = useState(false);
  const [editCidade, setEditCidade] = useState("");
  const [editEstado, setEditEstado] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);
  const [prPercent, setPrPercent] = useState<number | null>(null);
  const [geracaoEstimada, setGeracaoEstimada] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  // Filtrar UCs pela empresa selecionada
  const ucsFiltradas = useMemo(
    () => (empresaId ? ucs.filter((uc) => uc.empresaId === empresaId) : ucs),
    [ucs, empresaId]
  );

  const selectedUc = ucs.find((uc) => uc.ucId === ucId);

  const empresaOptions = useMemo(
    () => empresas.map((e) => ({ value: e.id, label: e.nome })),
    [empresas]
  );

  const ucOptions = useMemo(
    () =>
      ucsFiltradas.map((uc) => {
        const providers = [...new Set(uc.stations.map((s) => s.provider))];
        const providerLabel = providers.map((p) => p === "solis" ? "Solis" : "SunGrow").join(" + ");
        return {
          value: uc.ucId,
          label: `${uc.codigoUc} (${providerLabel})`,
        };
      }),
    [ucsFiltradas]
  );

  function handleEmpresaChange(id: string) {
    setEmpresaId(id);
    setUcId("");
    setData(null);
  }

  // Derivar month (YYYY-MM) a partir de dataFim para usar em APIs que ainda precisam
  const month = dataFim ? dataFim.slice(0, 7) : mesAtual;

  async function handleBuscar() {
    if (!selectedUc || !dataInicio || !dataFim) return;
    setLoading(true);
    setError(null);
    setData(null);
    setGeradoOk(false);
    setGerarError(null);
    setPrPercent(null);
    setGeracaoEstimada(null);
    setComentario("");

    const result = await fetchGeracaoMensalConsolidada(
      selectedUc.stations,
      month,
      dataInicio,
      dataFim
    );

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);

      // Calcular PR% real usando geração estimada da UC
      if (result.data) {
        const mesRef = `${month}-01`;
        const geracaoReal = result.data.totais.geracao_kwh;
        const estimativa = await calcularGeracaoEstimadaUC(selectedUc.ucId, mesRef, geracaoReal);
        if ("data" in estimativa) {
          setPrPercent(estimativa.data.pr_percent ?? null);
          setGeracaoEstimada(estimativa.data.geracao_estimada_kwh);
        }
      }
    }
    setLoading(false);
  }

  async function handleGerarRelatorio() {
    if (!data || !selectedUc || !month) return;

    setGerando(true);
    setGerarError(null);
    setGerarErrorType(undefined);
    setGerarCamposFaltantes([]);
    setGerarErrorUcId(null);
    setShowLocationEdit(false);
    setLocationSaved(false);

    // Usa o primeiro station_id como referência
    const primaryStation = selectedUc.stations[0]?.station_id;
    if (!primaryStation) {
      setGerarError("Nenhum station_id vinculado a esta UC.");
      setGerando(false);
      return;
    }

    const result = await gerarRelatorioSolis(primaryStation, month, data, comentario || null);

    if (result.error) {
      setGerarError(result.error);
      setGerarErrorType(result.errorType);
      setGerarCamposFaltantes(result.camposFaltantes ?? []);
      setGerarErrorUcId(result.ucId ?? null);
    } else {
      setGeradoOk(true);
      toast.success("Relatório enviado para geração com sucesso!", {
        description: "A página será atualizada em instantes.",
      });
      setTimeout(() => {
        router.refresh();
      }, 5000);
    }
    setGerando(false);
  }

  async function handleSaveLocation() {
    if (!gerarErrorUcId || !editCidade.trim() || !editEstado.trim()) return;
    setSavingLocation(true);

    const result = await updateUCLocalizacao(gerarErrorUcId, {
      cidade: editCidade.trim(),
      estado: editEstado.trim().toUpperCase(),
    });

    if (result.error) {
      setGerarError(result.error);
    } else {
      setLocationSaved(true);
      setShowLocationEdit(false);
    }
    setSavingLocation(false);
  }

  const chartData = data?.dias.map((d) => ({
    dia: d.date_br.slice(0, 5),
    kwh: d.geracao_kwh,
    pr: d.performance_ratio,
  }));

  const mediaDiaria = data?.metricas.media_diaria_kwh ?? 0;
  const isMultiProvider = selectedUc && selectedUc.stations.length > 1;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="h-5 w-5 text-primary" />
            Geração Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Combobox
                options={empresaOptions}
                value={empresaId}
                onChange={handleEmpresaChange}
                placeholder="Todas as empresas"
                className="w-64"
              />
            </div>
            <div className="space-y-2">
              <Label>UC / Usina</Label>
              <Combobox
                options={ucOptions}
                value={ucId}
                onChange={setUcId}
                placeholder="Selecionar UC..."
                className="w-72"
              />
            </div>
            <div className="space-y-2">
              <Label>Data início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Data fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleBuscar} disabled={loading || !ucId || !dataInicio || !dataFim}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Buscar relatório
                </>
              )}
            </Button>
          </div>
          {selectedUc && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{selectedUc.empresaNome}</span>
              <span>·</span>
              {selectedUc.stations.map((s) => (
                <Badge key={s.station_id} variant="outline" className="text-[10px]">
                  {s.provider === "solis" ? "Solis" : "SunGrow"}
                </Badge>
              ))}
              {isMultiProvider && (
                <Badge variant="secondary" className="text-[10px]">
                  <Zap className="mr-0.5 h-3 w-3" />
                  Multi-provedor
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {data && (
        <>
          {/* Header com nome da usina e período */}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {data.usina.station_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {data.periodo.mes_extenso} &middot; {data.usina.capacity_kwp} kW
                &middot; {data.periodo.data_inicio_br} a {data.periodo.data_fim_br}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isMultiProvider && (
                <Badge variant="secondary" className="text-sm">
                  <Zap className="mr-1 h-3.5 w-3.5" />
                  Consolidado
                </Badge>
              )}
              <Badge variant="outline" className="text-sm">
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                {data.periodo.dias_com_dados}/{data.periodo.dias_do_mes} dias
              </Badge>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Geração total</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {formatKwh(data.totais.geracao_kwh)}
                </p>
                <p className="text-sm text-muted-foreground">kWh</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Média diária</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {formatKwh(data.metricas.media_diaria_kwh)}
                </p>
                <p className="text-sm text-muted-foreground">kWh/dia</p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Melhor dia</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {formatKwh(data.metricas.melhor_dia.geracao_kwh)}
                </p>
                <p className="text-sm text-muted-foreground">
                  kWh — {data.metricas.melhor_dia.date_br}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-50 p-2">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Projeção mês</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {formatKwh(data.projecao.kwh_mes_completo)}
                </p>
                <p className="text-sm text-muted-foreground">
                  kWh — {data.projecao.completude_pct}% completo
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Métricas secundárias */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <TrendingDown className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pior dia</p>
                  <p className="text-sm font-semibold">
                    {formatKwh(data.metricas.pior_dia.geracao_kwh)} kWh
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.metricas.pior_dia.date_br}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <Activity className="h-5 w-5 shrink-0 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Performance (PR)</p>
                  {prPercent != null ? (
                    <>
                      <p className="text-sm font-semibold">
                        {Math.round(prPercent)}%{" "}
                        <span className={`text-xs font-medium ${
                          classificarDesempenho(prPercent) === "bom" ? "text-green-600" :
                          classificarDesempenho(prPercent) === "regular" ? "text-amber-600" :
                          "text-red-600"
                        }`}>
                          {classificarDesempenho(prPercent) === "bom" ? "Bom" :
                           classificarDesempenho(prPercent) === "regular" ? "Regular" : "Ruim"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(prPercent)}% do potencial atingido
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground">—</p>
                      <p className="text-xs text-muted-foreground">
                        Preencha os parâmetros de estimativa da UC
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <Target className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Geração estimada</p>
                  {geracaoEstimada != null ? (
                    <>
                      <p className="text-sm font-semibold">
                        {formatKwh(geracaoEstimada)} kWh
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Real: {formatKwh(data.totais.geracao_kwh)} kWh
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground">—</p>
                      <p className="text-xs text-muted-foreground">
                        Yield: {data.metricas.pr_medio.toFixed(2)} kWh/kW/dia
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico diário */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Geração diária (kWh)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData && (
                <SolisGeracaoChart chartData={chartData} mediaDiaria={mediaDiaria} />
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  PR &ge; 2.0
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
                  PR 1.0 – 2.0
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
                  PR &lt; 1.0
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-primary" />
                  Média diária
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Comentário do admin */}
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="comentario_admin">
                Comentário para o relatório (opcional)
              </Label>
              <Textarea
                id="comentario_admin"
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, 600))}
                placeholder="Ex: Geração impactada por dias nublados no início do mês..."
                rows={3}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">
                {600 - comentario.length} caracteres restantes
              </p>
            </CardContent>
          </Card>

          {/* Botão Gerar Relatório */}
          <div className="flex flex-wrap items-center gap-4">
            {geradoOk ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">
                  Relatório enviado para geração com sucesso!
                </p>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleGerarRelatorio}
                disabled={gerando}
              >
                {gerando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando relatório...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            )}
            {gerarError && !locationSaved && (
              <div className="w-full space-y-3">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-700">
                        {gerarErrorType === "estimativa"
                          ? "Não foi possível calcular a geração estimada"
                          : gerarErrorType === "tarifa"
                            ? "Classificação tarifária incompleta"
                            : "Erro ao gerar relatório"}
                      </p>
                      {gerarCamposFaltantes.length > 0 && (
                        <div>
                          <p className="text-xs text-red-600 mb-1">Campos faltantes:</p>
                          <ul className="list-disc pl-5 text-sm text-red-600 space-y-0.5">
                            {gerarCamposFaltantes.map((campo) => (
                              <li key={campo}>{campo}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {gerarCamposFaltantes.length === 0 && (
                        <p className="text-sm text-red-600">{gerarError}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {gerarCamposFaltantes.some(
                          (c) => c === "Cidade" || c === "Estado"
                        ) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-100"
                            onClick={() => setShowLocationEdit(true)}
                          >
                            <MapPin className="mr-1.5 h-3.5 w-3.5" />
                            Preencher cidade/estado
                          </Button>
                        )}
                        {gerarErrorUcId && (
                          <a
                            href={`/admin/unidades/${gerarErrorUcId}`}
                            className="inline-flex items-center gap-1 text-sm text-red-600 underline hover:text-red-800"
                          >
                            Editar UC completa
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {showLocationEdit && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-800 mb-3">
                      Preencher localização da UC
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-amber-700">Cidade</Label>
                        <Input
                          value={editCidade}
                          onChange={(e) => setEditCidade(e.target.value)}
                          placeholder="Ex: São Paulo"
                          className="w-48 border-amber-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-amber-700">Estado (UF)</Label>
                        <Input
                          value={editEstado}
                          onChange={(e) => setEditEstado(e.target.value.slice(0, 2))}
                          placeholder="Ex: SP"
                          maxLength={2}
                          className="w-24 border-amber-300"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSaveLocation}
                        disabled={savingLocation || !editCidade.trim() || !editEstado.trim()}
                      >
                        {savingLocation ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {locationSaved && (
              <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">
                    Localização atualizada com sucesso! Clique em &quot;Gerar Relatório&quot; para tentar novamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { fetchGeracaoMensal, gerarRelatorioSolis } from "@/lib/actions/solis";
import type { SolisGeracaoMensal as GeracaoData } from "@/lib/actions/solis";
import type { UsinaUC } from "@/lib/actions/solis";
import { ProviderFilterTabs, type ProviderFilter } from "@/components/shared/ProviderFilter";

function formatKwh(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export interface UsinaComProvider extends UsinaUC {
  provider: "solis" | "sungrow";
}

interface Props {
  usinas: UsinaComProvider[];
}

export function SolisGeracaoMensal({ usinas }: Props) {
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("todos");

  const usinasFiltradas = providerFilter === "todos"
    ? usinas
    : usinas.filter((u) => u.provider === providerFilter);

  const [stationId, setStationId] = useState(usinas[0]?.station_id ?? "");
  const [month, setMonth] = useState(mesAtual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeracaoData | null>(null);
  const [gerando, setGerando] = useState(false);
  const [geradoOk, setGeradoOk] = useState(false);
  const [gerarError, setGerarError] = useState<string | null>(null);

  const selectedUsina = usinas.find((u) => u.station_id === stationId) ?? usinasFiltradas[0];
  const provider = selectedUsina?.provider ?? "solis";

  async function handleBuscar() {
    if (!stationId || !month) return;
    setLoading(true);
    setError(null);
    setData(null);
    setGeradoOk(false);
    setGerarError(null);

    const result = await fetchGeracaoMensal(stationId, month, provider);

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
    }
    setLoading(false);
  }

  async function handleGerarRelatorio() {
    if (!data || !stationId || !month) return;
    setGerando(true);
    setGerarError(null);

    const result = await gerarRelatorioSolis(stationId, month, data);

    if (result.error) {
      setGerarError(result.error);
    } else {
      setGeradoOk(true);
    }
    setGerando(false);
  }

  const chartData = data?.dias.map((d) => ({
    dia: d.date_br.slice(0, 5),
    kwh: d.geracao_kwh,
    pr: d.performance_ratio,
  }));

  const mediaDiaria = data?.metricas.media_diaria_kwh ?? 0;

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
              <Label>Provedor</Label>
              <ProviderFilterTabs value={providerFilter} onChange={(v) => { setProviderFilter(v); setData(null); }} />
            </div>
            <div className="space-y-2">
              <Label>Usina</Label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="flex h-8 w-64 items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {usinasFiltradas.map((u) => (
                  <option key={u.station_id} value={u.station_id}>
                    [{u.provider === "solis" ? "Solis" : "SunGrow"}] {u.station_name} ({u.potencia_instalada_kwp} kWp)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Mês</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handleBuscar} disabled={loading || !stationId}>
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
                {data.periodo.mes_extenso} &middot; {data.usina.capacity_kwp} kWp
                &middot; {data.periodo.data_inicio_br} a {data.periodo.data_fim_br}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              {data.periodo.dias_com_dados}/{data.periodo.dias_do_mes} dias
            </Badge>
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
                  <p className="text-xs text-muted-foreground">PR médio</p>
                  <p className="text-sm font-semibold">
                    {data.metricas.pr_medio.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Min: {data.metricas.pr_min.toFixed(2)} — Max: {data.metricas.pr_max.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Dias abaixo PR 1.0</p>
                  <p className="text-sm font-semibold">
                    {data.metricas.dias_abaixo_pr1} dia{data.metricas.dias_abaixo_pr1 !== 1 && "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mediana: {formatKwh(data.metricas.mediana_diaria_kwh)} kWh/dia
                  </p>
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
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #E5E7EB",
                        fontSize: 13,
                      }}
                      formatter={(value, name) => {
                        if (name === "kwh") return [`${formatKwh(Number(value))} kWh`, "Geração"];
                        return [String(value), String(name)];
                      }}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <ReferenceLine
                      y={mediaDiaria}
                      stroke="#F97316"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                      label={{
                        value: `Média: ${formatKwh(mediaDiaria)}`,
                        position: "insideTopRight",
                        fill: "#F97316",
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="kwh" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {chartData?.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.pr < 1 ? "#EF4444" : entry.pr >= 2 ? "#10B981" : "#F59E0B"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
            {gerarError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-600">{gerarError}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

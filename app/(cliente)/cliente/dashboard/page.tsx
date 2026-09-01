import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getUCIdsCliente, getUltimoMesComDados, getResumoGeracaoCliente, getResumoGeracaoClienteRange, getDadosGeracaoCliente, getEconomiaCliente, getUsinasOfflineCliente, getAcumuladoCliente } from "@/lib/actions/dados-geracao";
import { DashboardCards } from "@/components/cliente/DashboardCards";
import { GeracaoChartLazy } from "@/components/cliente/GeracaoChartLazy";
import { EconomiaChartLazy } from "@/components/cliente/EconomiaChartLazy";
import { DashboardPeriodFilter } from "@/components/cliente/DashboardPeriodFilter";
import { UsinasOfflineBanner } from "@/components/cliente/UsinasOfflineBanner";
import { AcumuladoCards } from "@/components/cliente/AcumuladoCards";

export const dynamic = "force-dynamic";

/** Deriva mes_referencia (primeiro dia do mês) de uma data qualquer */
function toMesReferencia(dateStr: string): string {
  return dateStr.substring(0, 7) + "-01";
}

interface Props {
  searchParams: Promise<{ mes?: string; inicio?: string; fim?: string }>;
}

export default async function ClienteDashboardPage({ searchParams }: Props) {
  const [profile, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  // Fetch ucIds, usinasOffline and acumulado in parallel (all only need empresa_id)
  const [ucIds, usinasOffline, acumulado] = await Promise.all([
    getUCIdsCliente(profile.empresa_id),
    getUsinasOfflineCliente(profile.empresa_id),
    getAcumuladoCliente(profile.empresa_id),
  ]);

  // Determinar se filtro é por range de datas ou mês único
  const hasRange = params.inicio && params.fim;
  const mesInicio = hasRange ? toMesReferencia(params.inicio!) : null;
  const mesFim = hasRange ? toMesReferencia(params.fim!) : null;

  // Fallback: último mês com dados
  const mesFallback = !hasRange
    ? (params.mes || await getUltimoMesComDados(ucIds))
    : undefined;

  // KPI cards: afetados pelo filtro de datas (range ou mês único)
  const resumoPromise = hasRange && mesInicio && mesFim
    ? getResumoGeracaoClienteRange(profile.empresa_id, mesInicio, mesFim, ucIds)
    : getResumoGeracaoCliente(profile.empresa_id, mesFallback, ucIds);

  // Gráficos: sempre últimos 12 meses (independem do filtro)
  const [resumo, dadosGeracao, dadosEconomia] = await Promise.all([
    resumoPromise,
    getDadosGeracaoCliente(profile.empresa_id, ucIds),
    getEconomiaCliente(profile.empresa_id, ucIds),
  ]);

  // Agrupar dados por mes para o grafico (ultimos 12 meses)
  const dadosPorMes = new Map<string, { geracao_kwh: number; geracao_estimada_kwh: number }>();
  for (const dado of dadosGeracao) {
    const existing = dadosPorMes.get(dado.mes_referencia);
    if (existing) {
      existing.geracao_kwh += dado.geracao_kwh;
      existing.geracao_estimada_kwh += dado.geracao_estimada_kwh ?? 0;
    } else {
      dadosPorMes.set(dado.mes_referencia, {
        geracao_kwh: dado.geracao_kwh,
        geracao_estimada_kwh: dado.geracao_estimada_kwh ?? 0,
      });
    }
  }

  const chartData = Array.from(dadosPorMes.entries())
    .map(([mes, valores]) => ({
      mes_referencia: mes,
      ...valores,
    }))
    .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia))
    .slice(-12);

  // Agrupar economia por mes (somar UCs do mesmo mes)
  const economiaPorMes = new Map<string, number>();
  for (const dado of dadosEconomia) {
    const existing = economiaPorMes.get(dado.mes_referencia) ?? 0;
    economiaPorMes.set(dado.mes_referencia, existing + (dado.economia_estimada ?? 0));
  }

  const economiaData = Array.from(economiaPorMes.entries())
    .map(([mes, valor]) => ({
      mes_referencia: mes,
      economia_reais: valor,
    }))
    .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia))
    .slice(-12);

  // Mês default para popular os inputs do filtro
  const mesParaFiltro = mesFallback || mesFim || undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe a geração da sua usina
          </p>
        </div>
        <Suspense>
          <DashboardPeriodFilter defaultMes={mesParaFiltro} />
        </Suspense>
      </div>

      <UsinasOfflineBanner usinas={usinasOffline} />

      <DashboardCards
        geracaoTotal={resumo.geracao_total}
        estimadaTotal={resumo.estimada_total}
        economiaTotal={resumo.economia_total}
        performance={resumo.performance}
        performanceRatio={resumo.performance_ratio ?? null}
      />

      <AcumuladoCards
        geracaoAcumulada={acumulado.geracao_acumulada_total}
        economiaAcumulada={acumulado.economia_acumulada_total}
        atualizadoEm={acumulado.acumulado_atualizado_em}
      />

      <GeracaoChartLazy dados={chartData} />

      <EconomiaChartLazy dados={economiaData} />
    </div>
  );
}

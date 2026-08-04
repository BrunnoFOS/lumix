import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getUCIdsCliente, getUltimoMesComDados, getResumoGeracaoCliente, getDadosGeracaoCliente, getEconomiaCliente, getUsinasOfflineCliente } from "@/lib/actions/dados-geracao";
import { DashboardCards } from "@/components/cliente/DashboardCards";
import { GeracaoChartLazy } from "@/components/cliente/GeracaoChartLazy";
import { EconomiaChartLazy } from "@/components/cliente/EconomiaChartLazy";
import { DashboardPeriodFilter } from "@/components/cliente/DashboardPeriodFilter";
import { UsinasOfflineBanner } from "@/components/cliente/UsinasOfflineBanner";

interface Props {
  searchParams: Promise<{ mes?: string }>;
}

export default async function ClienteDashboardPage({ searchParams }: Props) {
  // Buscar profile e searchParams em paralelo
  const [profile, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  // Buscar UCs uma unica vez, depois passar os IDs para as 3 queries
  const ucIds = await getUCIdsCliente(profile.empresa_id);

  // Se nenhum mes foi selecionado, usar o ultimo mes com dados
  const mesSelecionado = params.mes || await getUltimoMesComDados(ucIds);

  const [resumo, dadosGeracao, dadosEconomia, usinasOffline] = await Promise.all([
    getResumoGeracaoCliente(profile.empresa_id, mesSelecionado, ucIds),
    getDadosGeracaoCliente(profile.empresa_id, ucIds),
    getEconomiaCliente(profile.empresa_id, ucIds),
    getUsinasOfflineCliente(profile.empresa_id),
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
          <DashboardPeriodFilter defaultMes={mesSelecionado} />
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

      <GeracaoChartLazy dados={chartData} />

      <EconomiaChartLazy dados={economiaData} />
    </div>
  );
}

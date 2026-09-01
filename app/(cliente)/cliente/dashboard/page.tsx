import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getUCIdsCliente, getUltimoMesComDados, getResumoGeracaoCliente, getDadosGeracaoCliente, getEconomiaCliente, getUsinasOfflineCliente, getAcumuladoCliente } from "@/lib/actions/dados-geracao";
import { GeracaoChartLazy } from "@/components/cliente/GeracaoChartLazy";
import { EconomiaChartLazy } from "@/components/cliente/EconomiaChartLazy";
import { DashboardKPISection } from "@/components/cliente/DashboardKPISection";
import { UsinasOfflineBanner } from "@/components/cliente/UsinasOfflineBanner";
import { AcumuladoCards } from "@/components/cliente/AcumuladoCards";

export const dynamic = "force-dynamic";

export default async function ClienteDashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  // Fetch ucIds, usinasOffline and acumulado in parallel (all only need empresa_id)
  const [ucIds, usinasOffline, acumulado] = await Promise.all([
    getUCIdsCliente(profile.empresa_id),
    getUsinasOfflineCliente(profile.empresa_id),
    getAcumuladoCliente(profile.empresa_id),
  ]);

  // Último mês com dados (para KPI inicial e default do filtro)
  const ultimoMes = await getUltimoMesComDados(ucIds);

  // KPI cards: com fallback para API (apenas os 4 KPIs buscam da API)
  // Gráficos: sem fallback, usam apenas dados já existentes no banco
  const [resumo, dadosGeracao] = await Promise.all([
    getResumoGeracaoCliente(profile.empresa_id, ultimoMes, ucIds),
    getDadosGeracaoCliente(profile.empresa_id, ucIds, 12, false),
  ]);

  const dadosEconomia = await getEconomiaCliente(
    profile.empresa_id, ucIds, 12, false, dadosGeracao
  );

  // Agrupar dados por mês para o gráfico (últimos 12 meses)
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

  // Agrupar economia por mês (somar UCs do mesmo mês)
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe a geração da sua usina
        </p>
      </div>

      <UsinasOfflineBanner usinas={usinasOffline} />

      <DashboardKPISection
        empresaId={profile.empresa_id}
        ucIds={ucIds}
        initialResumo={{
          geracao_total: resumo.geracao_total,
          estimada_total: resumo.estimada_total,
          economia_total: resumo.economia_total,
          performance: resumo.performance,
          performance_ratio: resumo.performance_ratio ?? null,
        }}
        defaultMes={ultimoMes}
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

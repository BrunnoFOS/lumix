import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, getEmpresaIdsAcessiveis } from "@/lib/actions/profile";
import { getResumoGeracaoCliente, getDadosGeracaoCliente } from "@/lib/actions/dados-geracao";
import { DashboardCards } from "@/components/cliente/DashboardCards";
import { GeracaoChart } from "@/components/cliente/GeracaoChart";
import { DashboardPeriodFilter } from "@/components/cliente/DashboardPeriodFilter";

interface Props {
  searchParams: Promise<{ mes?: string }>;
}

export default async function ClienteDashboardPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  const params = await searchParams;
  const empresaIds = await getEmpresaIdsAcessiveis(profile.empresa_id);
  const [resumo, dadosGeracao] = await Promise.all([
    getResumoGeracaoCliente(empresaIds, params.mes),
    getDadosGeracaoCliente(empresaIds),
  ]);

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
          <DashboardPeriodFilter />
        </Suspense>
      </div>

      <DashboardCards
        geracaoTotal={resumo.geracao_total}
        estimadaTotal={resumo.estimada_total}
        economiaTotal={resumo.economia_total}
        performance={resumo.performance}
        performanceRatio={resumo.performance_ratio ?? null}
      />

      <GeracaoChart dados={chartData} />
    </div>
  );
}

import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Building2, Zap, FileText, DollarSign, TrendingUp, Activity } from "lucide-react";
import { formatCurrency, formatKWh, formatMesReferencia } from "@/lib/utils";
import { SolisGeracaoMensal } from "@/components/admin/SolisGeracaoMensal";
import type { UsinaComProvider } from "@/components/admin/SolisGeracaoMensal";
import { fetchSolisUCs, fetchSungrowUCs } from "@/lib/actions/solis";

async function getEmpresasDashboard(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  // Buscar empresas ativas com suas UCs
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nome, cnpj, ativa")
    .eq("ativa", true)
    .eq("arquivada", false)
    .order("nome");

  if (!empresas || empresas.length === 0) return [];

  // Buscar mês atual
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // Buscar dados de todas as UCs, geração e faturas do mês atual
  const empresaIds = empresas.map((e) => e.id);

  const [{ data: ucs }, { data: relatorios }, { data: faturas }] = await Promise.all([
    supabase
      .from("unidades_consumidoras")
      .select("id, empresa_id, geracao_estimada_mensal_kwh")
      .in("empresa_id", empresaIds)
      .eq("ativa", true),
    supabase
      .from("relatorios")
      .select("empresa_id, status_envio")
      .in("empresa_id", empresaIds)
      .eq("status_envio", "pendente"),
    supabase
      .from("faturas")
      .select("uc_id, economia_estimada, valor_faturado, uc:unidades_consumidoras!inner(empresa_id)")
      .eq("mes_referencia", mesAtual),
  ]);

  // Buscar dados de geração do mês atual
  const ucIds = ucs?.map((uc) => uc.id) ?? [];
  const { data: geracoes } = ucIds.length > 0
    ? await supabase
        .from("dados_geracao")
        .select("uc_id, geracao_kwh, geracao_estimada_kwh, indice_performance")
        .in("uc_id", ucIds)
        .eq("mes_referencia", mesAtual)
    : { data: [] };

  // Mapear dados por empresa
  return empresas.map((empresa) => {
    const empresaUCs = ucs?.filter((uc) => uc.empresa_id === empresa.id) ?? [];
    const empresaUCIds = empresaUCs.map((uc) => uc.id);
    const empresaGeracoes = geracoes?.filter((g) => empresaUCIds.includes(g.uc_id)) ?? [];
    const empresaFaturas = faturas?.filter((f) => {
      const ucRaw = f.uc as unknown;
      const uc = Array.isArray(ucRaw) ? ucRaw[0] : ucRaw;
      return (uc as { empresa_id?: string })?.empresa_id === empresa.id;
    }) ?? [];
    const empresaRelatorios = relatorios?.filter((r) => r.empresa_id === empresa.id) ?? [];

    const geracao_total = empresaGeracoes.reduce((sum, g) => sum + (g.geracao_kwh || 0), 0);
    const economia_total = empresaFaturas.reduce((sum, f) => sum + ((f.economia_estimada || 0) as number), 0);
    const qtd_ucs = empresaUCs.length;
    const relatorios_pendentes = empresaRelatorios.length;

    // Performance média
    const performances = empresaGeracoes.filter((g) => g.indice_performance).map((g) => g.indice_performance);
    const mainPerformance = performances.length > 0 ? performances[0] : null;

    return {
      ...empresa,
      qtd_ucs,
      geracao_total,
      economia_total,
      relatorios_pendentes,
      performance: mainPerformance,
    };
  });
}

export default async function AdminDashboardPage() {
  const supabase = await createServerClient();

  const [empresasRes, ucsRes, relatoriosRes, faturasRes] = await Promise.all([
    supabase.from("empresas").select("id", { count: "exact", head: true }).eq("arquivada", false),
    supabase.from("unidades_consumidoras").select("id", { count: "exact", head: true }).eq("arquivada", false),
    supabase.from("relatorios").select("id", { count: "exact", head: true }).eq("status_envio", "pendente"),
    supabase.from("faturas").select("id", { count: "exact", head: true }).eq("status", "pendente"),
  ]);

  const [empresasDashboard, solisUCs, sungrowUCs] = await Promise.all([
    getEmpresasDashboard(supabase),
    fetchSolisUCs(),
    fetchSungrowUCs(),
  ]);

  const todasUsinas: UsinaComProvider[] = [
    ...solisUCs.data.map((u) => ({ ...u, provider: "solis" as const })),
    ...sungrowUCs.data.map((u) => ({ ...u, provider: "sungrow" as const })),
  ];

  const stats = [
    { label: "Clientes", value: empresasRes.count ?? 0, icon: Building2, href: "/admin/clientes", color: "text-primary", bg: "bg-orange-50" },
    { label: "Unidades consumidoras", value: ucsRes.count ?? 0, icon: Zap, href: "/admin/unidades", color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Relatórios pendentes", value: relatoriosRes.count ?? 0, icon: FileText, href: "/admin/relatorios", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Faturas pendentes", value: faturasRes.count ?? 0, icon: DollarSign, href: "/admin/faturas", color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const PERF_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    bom: { label: "Bom", variant: "default" },
    regular: { label: "Regular", variant: "secondary" },
    ruim: { label: "Ruim", variant: "destructive" },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral do sistema Lumix
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">{stat.value}</p>
              <LinkButton href={stat.href} variant="ghost" size="sm" className="mt-2 -ml-3 text-sm">
                Ver detalhes
              </LinkButton>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-company breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dados por cliente</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informações individuais do mês atual
        </p>
      </div>

      {empresasDashboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum cliente ativo cadastrado.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empresasDashboard.map((empresa) => (
            <Card key={empresa.id} className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{empresa.nome}</CardTitle>
                  {empresa.performance && PERF_CONFIG[empresa.performance] && (
                    <Badge variant={PERF_CONFIG[empresa.performance].variant}>
                      {PERF_CONFIG[empresa.performance].label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Geração</p>
                    <p className="text-sm font-semibold">
                      {empresa.geracao_total > 0 ? formatKWh(empresa.geracao_total) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Economia</p>
                    <p className="text-sm font-semibold">
                      {empresa.economia_total > 0 ? formatCurrency(empresa.economia_total) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">UCs</p>
                    <p className="text-sm font-semibold">{empresa.qtd_ucs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rel. pendentes</p>
                    <p className="text-sm font-semibold">{empresa.relatorios_pendentes}</p>
                  </div>
                </div>
                <LinkButton
                  href={`/admin/clientes/${empresa.id}`}
                  variant="ghost"
                  size="sm"
                  className="-ml-3 text-sm"
                >
                  Ver detalhes
                </LinkButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Geração mensal */}
      {todasUsinas.length > 0 && (
        <SolisGeracaoMensal usinas={todasUsinas} />
      )}
    </div>
  );
}

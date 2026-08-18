export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Zap, FileText, DollarSign } from "lucide-react";
import { formatCurrency, formatKWh } from "@/lib/utils";
import { SolisGeracaoMensal } from "@/components/admin/SolisGeracaoMensal";
import { getUCsComStations } from "@/lib/actions/unidades";
import { getEmpresas } from "@/lib/actions/empresas";

const PERF_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  bom: { label: "Bom", variant: "default" },
  regular: { label: "Regular", variant: "secondary" },
  ruim: { label: "Ruim", variant: "destructive" },
};

async function DadosPorCliente() {
  const supabase = await createServerClient();

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    { data: empresas },
    { data: ucs },
    { data: relatoriosPendentes },
    { data: faturasMes },
    { data: geracoesMes },
  ] = await Promise.all([
    supabase.from("empresas").select("id, nome, cnpj, ativa").eq("ativa", true).eq("arquivada", false).order("nome"),
    supabase.from("unidades_consumidoras").select("id, empresa_id").eq("ativa", true),
    supabase.from("relatorios").select("empresa_id, status_envio").eq("status_envio", "pendente"),
    supabase.from("faturas").select("uc_id, economia_estimada, uc:unidades_consumidoras!inner(empresa_id)").eq("mes_referencia", mesAtual),
    supabase.from("dados_geracao").select("uc_id, geracao_kwh, geracao_estimada_kwh, indice_performance").eq("mes_referencia", mesAtual),
  ]);

  // Build UC → empresa_id lookup
  const ucEmpresaMap = new Map(ucs?.map((uc) => [uc.id, uc.empresa_id]) ?? []);

  const empresasDashboard = (empresas ?? []).map((empresa) => {
    const empresaUCs = ucs?.filter((uc) => uc.empresa_id === empresa.id) ?? [];
    const empresaUCIds = new Set(empresaUCs.map((uc) => uc.id));
    const empresaGeracoes = geracoesMes?.filter((g) => empresaUCIds.has(g.uc_id)) ?? [];
    const empresaFaturas = faturasMes?.filter((f) => {
      const ucRaw = f.uc as unknown;
      const uc = Array.isArray(ucRaw) ? ucRaw[0] : ucRaw;
      return (uc as { empresa_id?: string })?.empresa_id === empresa.id;
    }) ?? [];
    const empresaRelatorios = relatoriosPendentes?.filter((r) => r.empresa_id === empresa.id) ?? [];

    const geracao_total = empresaGeracoes.reduce((sum, g) => sum + (g.geracao_kwh || 0), 0);
    const economia_total = empresaFaturas.reduce((sum, f) => sum + ((f.economia_estimada || 0) as number), 0);
    const performances = empresaGeracoes.filter((g) => g.indice_performance).map((g) => g.indice_performance);

    return {
      ...empresa,
      qtd_ucs: empresaUCs.length,
      geracao_total,
      economia_total,
      relatorios_pendentes: empresaRelatorios.length,
      performance: performances.length > 0 ? performances[0] : null,
    };
  });

  if (empresasDashboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum cliente ativo cadastrado.
        </p>
      </div>
    );
  }

  return (
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
                <p className="text-xs text-muted-foreground">Geracao</p>
                <p className="text-sm font-semibold">
                  {empresa.geracao_total > 0 ? formatKWh(empresa.geracao_total) : "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Economia</p>
                <p className="text-sm font-semibold">
                  {empresa.economia_total > 0 ? formatCurrency(empresa.economia_total) : "\u2014"}
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
  );
}

async function GeracaoMensalSection() {
  const [empresasList, ucsComStations] = await Promise.all([
    getEmpresas(),
    getUCsComStations(),
  ]);

  if (ucsComStations.length === 0) return null;

  const empresasOptions = empresasList.map((e) => ({ id: e.id, nome: e.nome }));
  return <SolisGeracaoMensal empresas={empresasOptions} ucs={ucsComStations} />;
}

function DadosPorClienteFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-8" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function GeracaoMensalFallback() {
  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createServerClient();

  // Only fetch stats counts for the top cards — they're fast (head: true)
  const [empresasRes, ucsRes, relatoriosRes, faturasRes] = await Promise.all([
    supabase.from("empresas").select("id", { count: "exact", head: true }).eq("arquivada", false),
    supabase.from("unidades_consumidoras").select("id", { count: "exact", head: true }).eq("arquivada", false),
    supabase.from("relatorios").select("id", { count: "exact", head: true }).eq("status_envio", "pendente"),
    supabase.from("faturas").select("id", { count: "exact", head: true }).eq("status", "pendente"),
  ]);

  const stats = [
    { label: "Clientes", value: empresasRes.count ?? 0, icon: Building2, href: "/admin/clientes", color: "text-primary", bg: "bg-orange-50" },
    { label: "Unidades consumidoras", value: ucsRes.count ?? 0, icon: Zap, href: "/admin/unidades", color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Relatórios pendentes", value: relatoriosRes.count ?? 0, icon: FileText, href: "/admin/relatorios", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Faturas pendentes", value: faturasRes.count ?? 0, icon: DollarSign, href: "/admin/faturas", color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral do sistema Lumix
        </p>
      </div>

      {/* Stats overview — renders immediately */}
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

      {/* Per-company breakdown — streamed */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dados por cliente</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informações individuais do mês atual
        </p>
      </div>

      <Suspense fallback={<DadosPorClienteFallback />}>
        <DadosPorCliente />
      </Suspense>

      {/* Geração mensal — streamed */}
      <Suspense fallback={<GeracaoMensalFallback />}>
        <GeracaoMensalSection />
      </Suspense>
    </div>
  );
}

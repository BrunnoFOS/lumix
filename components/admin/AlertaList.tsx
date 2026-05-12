"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  Info,
  Radio,
  Clock,
  Wifi,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProviderFilterTabs, type ProviderFilter } from "@/components/shared/ProviderFilter";
import {
  fetchAlertas,
  type AlertaItem,
  type AlertaSummary,
} from "@/lib/actions/alertas";

const levelConfig = {
  tip: {
    label: "Dica",
    icon: Info,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  general: {
    label: "Geral",
    icon: Bell,
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  emergency: {
    label: "Emergência",
    icon: AlertTriangle,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    dotClass: "bg-red-500",
  },
} as const;

const stateConfig = {
  pending: { label: "Pendente", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  processed: { label: "Processado", class: "bg-blue-100 text-blue-700 border-blue-200" },
  resolved: { label: "Resolvido", class: "bg-green-100 text-green-700 border-green-200" },
} as const;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}min`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

function AlertaCard({ alerta }: { alerta: AlertaItem }) {
  const [expanded, setExpanded] = useState(false);
  const level = levelConfig[alerta.alarm_level_label] ?? levelConfig.tip;
  const state = stateConfig[alerta.state_label] ?? stateConfig.pending;
  const LevelIcon = level.icon;

  return (
    <div className="rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", level.badgeClass)}>
          <LevelIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {alerta.alarm_msg}
            </h3>
            <Badge variant="outline" className={cn("text-[10px]", level.badgeClass)}>
              {level.label}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", state.class)}>
              {state.label}
            </Badge>
            {alerta.provider && (
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                {alerta.provider === "solis" ? "Solis" : "SunGrow"}
              </Badge>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3" />
              {alerta.station_name}
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              {alerta.inverter_sn}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {alerta.alarm_begin_time_br}
            </span>
            <span className="font-medium text-foreground">
              {formatDuration(alerta.alarm_duration_minutes)}
            </span>
          </div>

          {alerta.advice && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? "Ocultar detalhes" : "Ver detalhes"}
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}

          {expanded && alerta.advice && (
            <div className="mt-2 rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
              {alerta.advice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ summary }: { summary: AlertaSummary }) {
  const niveis = summary.por_nivel ?? {};
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{summary.total}</p>
      </div>
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-xs text-muted-foreground">Ativos</p>
        <p className="mt-1 text-2xl font-bold text-red-600">{summary.ativos}</p>
      </div>
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-xs text-muted-foreground">Emergência</p>
        <p className="mt-1 text-2xl font-bold text-red-600">{niveis.emergency ?? 0}</p>
      </div>
      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-xs text-muted-foreground">Dicas</p>
        <p className="mt-1 text-2xl font-bold text-blue-600">{niveis.tip ?? 0}</p>
      </div>
    </div>
  );
}

function AlertaListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export function AlertaList() {
  const [allItems, setAllItems] = useState<AlertaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderFilter>("todos");

  useEffect(() => {
    async function load() {
      const result = await fetchAlertas();
      if (result.error) {
        setError(result.error);
      } else {
        setAllItems(result.items);
      }
      setLoading(false);
    }
    load();
  }, []);

  const items = useMemo(() => {
    if (provider === "todos") return allItems;
    return allItems.filter((i) => i.provider === provider);
  }, [allItems, provider]);

  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const ativos = items.filter((i) => i.is_active);
    return {
      ok: true,
      total: items.length,
      ativos: ativos.length,
      por_nivel: {
        tip: ativos.filter((i) => i.alarm_level_label === "tip").length,
        general: ativos.filter((i) => i.alarm_level_label === "general").length,
        emergency: ativos.filter((i) => i.alarm_level_label === "emergency").length,
      },
      buscado_em: new Date().toISOString(),
    } as AlertaSummary;
  }, [items]);

  if (loading) return <AlertaListSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">
          Erro ao carregar alertas: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProviderFilterTabs value={provider} onChange={setProvider} />

      {summary && <SummaryCards summary={summary} />}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum alerta encontrado.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((alerta, i) => (
            <AlertaCard
              key={`${alerta.station_id}-${alerta.inverter_sn}-${alerta.alarm_code}-${i}`}
              alerta={alerta}
            />
          ))}
        </div>
      )}
    </div>
  );
}

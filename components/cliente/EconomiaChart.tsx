"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DadoEconomia {
  mes_referencia: string;
  economia_reais: number;
}

function formatMes(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(d);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-md">
      <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm" style={{ color: "var(--color-success)" }}>
        Economia: {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function EconomiaChart({ dados }: { dados: DadoEconomia[] }) {
  if (dados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Economia Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Sem dados de economia disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = dados.map((d) => ({
    mes: formatMes(d.mes_referencia),
    Economia: d.economia_reais,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Economia Mensal (últimos 12 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickFormatter={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="Economia"
              fill="var(--color-success)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

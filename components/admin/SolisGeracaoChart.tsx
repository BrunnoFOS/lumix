"use client";

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

interface ChartEntry {
  dia: string;
  kwh: number;
  pr: number;
}

function formatKwh(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

interface Props {
  chartData: ChartEntry[];
  mediaDiaria: number;
}

export function SolisGeracaoChart({ chartData, mediaDiaria }: Props) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13,
            }}
            formatter={(value, name) => {
              if (name === "kwh") return [`${formatKwh(Number(value))} kWh`, "Geracao"];
              return [String(value), String(name)];
            }}
            labelFormatter={(label) => `Dia ${label}`}
          />
          <ReferenceLine
            y={mediaDiaria}
            stroke="var(--primary)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Media: ${formatKwh(mediaDiaria)}`,
              position: "insideTopRight",
              fill: "var(--primary)",
              fontSize: 11,
            }}
          />
          <Bar dataKey="kwh" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.pr < 1 ? "var(--color-error)" : entry.pr >= 2 ? "var(--color-success)" : "var(--color-warning)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

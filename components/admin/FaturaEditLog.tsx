"use client";

import { History, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  alterado_em: string;
  admin: { id: string; nome: string } | null;
}

interface Props {
  log: LogEntry[];
}

const FIELD_LABELS: Record<string, string> = {
  denominacao: "Denominação",
  contrato: "Contrato",
  inicio_ciclo: "Início do ciclo",
  fim_ciclo: "Fim do ciclo",
  energia_faturada_fp: "Energia faturada FP (kWh)",
  valor_tarifa_fp: "Tarifa FP (R$/kWh)",
  kwh_compensado_fp: "kWh compensado FP",
  tarifa_compensada_fp: "Tarifa compensada FP (R$/kWh)",
  energia_consumida_fp: "Energia consumida FP (kWh)",
  energia_injetada_fp: "Energia injetada FP (kWh)",
  valor_faturado: "Valor faturado (R$)",
  valor_total: "Valor total (R$)",
  consumo_kwh: "Consumo (kWh)",
  energia_injetada_kwh: "Energia injetada (kWh)",
  creditos_energia_kwh: "Créditos energia (kWh)",
  economia_estimada: "Economia estimada (R$)",
  demanda_contratada_kw: "Demanda contratada (kW)",
  valor_tusd: "TUSD (R$)",
  valor_te: "TE (R$)",
};

function formatLogValue(value: string | null): string {
  if (value == null) return "vazio";
  return value;
}

export function FaturaEditLog({ log }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-muted-foreground" />
          Histórico de edições
        </CardTitle>
      </CardHeader>
      <CardContent>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma edição registrada.</p>
        ) : (
          <div className="space-y-3">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">
                      {FIELD_LABELS[entry.campo_alterado] ?? entry.campo_alterado}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="font-mono">{formatLogValue(entry.valor_anterior)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-mono font-medium text-foreground">{formatLogValue(entry.valor_novo)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.admin?.nome ?? "Admin"} — {formatDateTime(entry.alterado_em)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

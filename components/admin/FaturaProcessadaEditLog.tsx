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
  consumo_total_kwh: "Consumo total (kWh)",
  consumo_ponta_kwh: "Consumo ponta (kWh)",
  consumo_fora_ponta_kwh: "Consumo fora ponta (kWh)",
  energia_injetada_kwh: "Energia injetada (kWh)",
  consumo_injetado_mesma_uc_kwh: "Crédito mesma UC (kWh)",
  consumo_injetado_outra_uc_kwh: "Crédito outra UC (kWh)",
  credito_acumulado_kwh: "Crédito acumulado (kWh)",
  valor_total_fatura_rs: "Valor total fatura (R$)",
  vto_ci_rs: "VTO CI (R$)",
  numero_fatura: "Número da fatura",
  data_vencimento: "Data de vencimento",
  tem_geracao_compartilhada: "Geração compartilhada",
  evidencia_geracao_compartilhada: "Evidência geração compartilhada",
  observacao: "Observação",
};

function formatLogValue(value: string | null): string {
  if (value == null) return "vazio";
  if (value === "true") return "Sim";
  if (value === "false") return "Não";
  return value;
}

export function FaturaProcessadaEditLog({ log }: Props) {
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

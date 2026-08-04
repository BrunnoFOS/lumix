"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateFaturaProcessada } from "@/lib/actions/faturas-processadas";
import { formatCurrency, formatKWh } from "@/lib/utils";
import type { FaturaProcessada } from "@/types/database";

type FPData = FaturaProcessada & {
  uc: { id: string; codigo_uc: string; titular: string; empresa: { id: string; nome: string } | null } | null;
};

interface Props {
  fp: FPData;
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

function formatDisplayValue(field: string, value: unknown): string {
  if (value == null) return "—";
  if (field === "tem_geracao_compartilhada") return value ? "Sim" : "Não";
  if (field.endsWith("_kwh")) return formatKWh(Number(value));
  if (field.endsWith("_rs")) return formatCurrency(Number(value));
  return String(value);
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function FaturaProcessadaDetail({ fp }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [consumoTotal, setConsumoTotal] = useState(fp.consumo_total_kwh?.toString() ?? "");
  const [consumoPonta, setConsumoPonta] = useState(fp.consumo_ponta_kwh?.toString() ?? "");
  const [consumoFP, setConsumoFP] = useState(fp.consumo_fora_ponta_kwh?.toString() ?? "");
  const [energiaInjetada, setEnergiaInjetada] = useState(fp.energia_injetada_kwh?.toString() ?? "");
  const [creditoMesmaUc, setCreditoMesmaUc] = useState(fp.consumo_injetado_mesma_uc_kwh?.toString() ?? "");
  const [creditoOutraUc, setCreditoOutraUc] = useState(fp.consumo_injetado_outra_uc_kwh?.toString() ?? "");
  const [creditoAcumulado, setCreditoAcumulado] = useState(fp.credito_acumulado_kwh?.toString() ?? "");
  const [valorTotal, setValorTotal] = useState(fp.valor_total_fatura_rs?.toString() ?? "");
  const [vtoCi, setVtoCi] = useState(fp.vto_ci_rs?.toString() ?? "");
  const [numeroFatura, setNumeroFatura] = useState(fp.numero_fatura ?? "");
  const [dataVencimento, setDataVencimento] = useState(fp.data_vencimento ?? "");
  const [geracaoCompartilhada, setGeracaoCompartilhada] = useState(fp.tem_geracao_compartilhada);
  const [evidencia, setEvidencia] = useState(fp.evidencia_geracao_compartilhada ?? "");
  const [observacao, setObservacao] = useState(fp.observacao ?? "");

  function resetForm() {
    setConsumoTotal(fp.consumo_total_kwh?.toString() ?? "");
    setConsumoPonta(fp.consumo_ponta_kwh?.toString() ?? "");
    setConsumoFP(fp.consumo_fora_ponta_kwh?.toString() ?? "");
    setEnergiaInjetada(fp.energia_injetada_kwh?.toString() ?? "");
    setCreditoMesmaUc(fp.consumo_injetado_mesma_uc_kwh?.toString() ?? "");
    setCreditoOutraUc(fp.consumo_injetado_outra_uc_kwh?.toString() ?? "");
    setCreditoAcumulado(fp.credito_acumulado_kwh?.toString() ?? "");
    setValorTotal(fp.valor_total_fatura_rs?.toString() ?? "");
    setVtoCi(fp.vto_ci_rs?.toString() ?? "");
    setNumeroFatura(fp.numero_fatura ?? "");
    setDataVencimento(fp.data_vencimento ?? "");
    setGeracaoCompartilhada(fp.tem_geracao_compartilhada);
    setEvidencia(fp.evidencia_geracao_compartilhada ?? "");
    setObservacao(fp.observacao ?? "");
  }

  function handleCancel() {
    resetForm();
    setEditing(false);
  }

  function parseNum(v: string): number | null {
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  async function handleSave() {
    setSaving(true);

    const updates: Record<string, string | number | boolean | null> = {
      consumo_total_kwh: parseNum(consumoTotal),
      consumo_ponta_kwh: parseNum(consumoPonta),
      consumo_fora_ponta_kwh: parseNum(consumoFP),
      energia_injetada_kwh: parseNum(energiaInjetada),
      consumo_injetado_mesma_uc_kwh: parseNum(creditoMesmaUc),
      consumo_injetado_outra_uc_kwh: parseNum(creditoOutraUc),
      credito_acumulado_kwh: parseNum(creditoAcumulado),
      valor_total_fatura_rs: parseNum(valorTotal),
      vto_ci_rs: parseNum(vtoCi),
      numero_fatura: numeroFatura || null,
      data_vencimento: dataVencimento || null,
      tem_geracao_compartilhada: geracaoCompartilhada,
      evidencia_geracao_compartilhada: evidencia || null,
      observacao: observacao || null,
    };

    const result = await updateFaturaProcessada(fp.id, updates);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Dados atualizados com sucesso.");
      setEditing(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {editing ? (
          <>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="mr-2 h-3.5 w-3.5" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
              Salvar
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Consumo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.consumo_total_kwh}</Label>
                  <Input type="number" step="0.01" value={consumoTotal} onChange={(e) => setConsumoTotal(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.consumo_ponta_kwh}</Label>
                  <Input type="number" step="0.01" value={consumoPonta} onChange={(e) => setConsumoPonta(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.consumo_fora_ponta_kwh}</Label>
                  <Input type="number" step="0.01" value={consumoFP} onChange={(e) => setConsumoFP(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.consumo_total_kwh} value={formatDisplayValue("consumo_total_kwh", fp.consumo_total_kwh)} />
                <ReadonlyField label={FIELD_LABELS.consumo_ponta_kwh} value={formatDisplayValue("consumo_ponta_kwh", fp.consumo_ponta_kwh)} />
                <ReadonlyField label={FIELD_LABELS.consumo_fora_ponta_kwh} value={formatDisplayValue("consumo_fora_ponta_kwh", fp.consumo_fora_ponta_kwh)} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Energia injetada e créditos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Energia injetada e créditos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.energia_injetada_kwh}</Label>
                  <Input type="number" step="0.01" value={energiaInjetada} onChange={(e) => setEnergiaInjetada(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.consumo_injetado_mesma_uc_kwh}</Label>
                  <Input type="number" step="0.01" value={creditoMesmaUc} onChange={(e) => setCreditoMesmaUc(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.consumo_injetado_outra_uc_kwh}</Label>
                  <Input type="number" step="0.01" value={creditoOutraUc} onChange={(e) => setCreditoOutraUc(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.credito_acumulado_kwh}</Label>
                  <Input type="number" step="0.01" value={creditoAcumulado} onChange={(e) => setCreditoAcumulado(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.energia_injetada_kwh} value={formatDisplayValue("energia_injetada_kwh", fp.energia_injetada_kwh)} />
                <ReadonlyField label={FIELD_LABELS.consumo_injetado_mesma_uc_kwh} value={formatDisplayValue("consumo_injetado_mesma_uc_kwh", fp.consumo_injetado_mesma_uc_kwh)} />
                <ReadonlyField label={FIELD_LABELS.consumo_injetado_outra_uc_kwh} value={formatDisplayValue("consumo_injetado_outra_uc_kwh", fp.consumo_injetado_outra_uc_kwh)} />
                <ReadonlyField label={FIELD_LABELS.credito_acumulado_kwh} value={formatDisplayValue("credito_acumulado_kwh", fp.credito_acumulado_kwh)} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.valor_total_fatura_rs}</Label>
                  <Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.vto_ci_rs}</Label>
                  <Input type="number" step="0.01" value={vtoCi} onChange={(e) => setVtoCi(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.valor_total_fatura_rs} value={formatDisplayValue("valor_total_fatura_rs", fp.valor_total_fatura_rs)} />
                <ReadonlyField label={FIELD_LABELS.vto_ci_rs} value={formatDisplayValue("vto_ci_rs", fp.vto_ci_rs)} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Identificação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.numero_fatura}</Label>
                  <Input value={numeroFatura} onChange={(e) => setNumeroFatura(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.data_vencimento}</Label>
                  <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.numero_fatura} value={formatDisplayValue("numero_fatura", fp.numero_fatura)} />
                <ReadonlyField label={FIELD_LABELS.data_vencimento} value={fp.data_vencimento ? new Date(fp.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Geração compartilhada */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Geração compartilhada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="flex items-center gap-3">
                  <Switch checked={geracaoCompartilhada} onCheckedChange={setGeracaoCompartilhada} />
                  <Label className="text-xs">{geracaoCompartilhada ? "Sim" : "Não"}</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.evidencia_geracao_compartilhada}</Label>
                  <Textarea value={evidencia} onChange={(e) => setEvidencia(e.target.value)} rows={3} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.tem_geracao_compartilhada} value={formatDisplayValue("tem_geracao_compartilhada", fp.tem_geracao_compartilhada)} />
                <ReadonlyField label={FIELD_LABELS.evidencia_geracao_compartilhada} value={formatDisplayValue("evidencia_geracao_compartilhada", fp.evidencia_geracao_compartilhada)} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Observação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observação</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} placeholder="Notas adicionais..." />
          ) : (
            <p className="text-sm text-foreground">{fp.observacao || "—"}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

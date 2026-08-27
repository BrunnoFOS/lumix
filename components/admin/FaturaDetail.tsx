"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateFatura } from "@/lib/actions/faturas";
import { formatCurrency, formatKWh, formatDate } from "@/lib/utils";
import type { Fatura } from "@/types/database";

type FaturaData = Fatura & {
  uc: { id: string; codigo_uc: string; titular: string; distribuidora: string; empresa: { id: string; nome: string } | null } | null;
};

interface Props {
  fatura: FaturaData;
}

const FIELD_LABELS: Record<string, string> = {
  denominacao: "Denominação",
  contrato: "Contrato",
  inicio_ciclo: "Início do ciclo",
  fim_ciclo: "Fim do ciclo",
  energia_faturada_fp: "Energia faturada FP (kWh)",
  valor_tarifa_fp: "Tarifa FP (sem tributos) (R$/kWh)",
  tarifa_compensada_fp: "Tarifa compensada FP (R$/kWh)",
  energia_consumida_fp: "Energia consumida FP (kWh)",
  energia_injetada_fp: "Energia injetada FP (kWh)",
  valor_total: "Valor total (R$)",
  consumo_kwh: "Consumo (kWh)",
  energia_injetada_kwh: "Energia injetada (kWh)",
  creditos_energia_kwh: "Créditos energia (kWh)",
  demanda_contratada_kw: "Demanda contratada (kW)",
  valor_tusd: "TUSD (R$)",
  valor_te: "TE (R$)",
};

function formatDisplayValue(field: string, value: unknown): string {
  if (value == null) return "\u2014";
  if (field === "inicio_ciclo" || field === "fim_ciclo") return formatDate(String(value));
  // Campos de energia em kWh: _kwh, _kw, e campos _fp de energia
  if (field.endsWith("_kwh") || field.endsWith("_kw") ||
      field === "energia_faturada_fp" || field === "energia_consumida_fp" || field === "energia_injetada_fp") {
    return formatKWh(Number(value));
  }
  if (field === "valor_faturado" || field === "valor_total" || field === "economia_estimada" || field === "valor_tusd" || field === "valor_te") return formatCurrency(Number(value));
  if (field === "valor_tarifa_fp" || field === "tarifa_compensada_fp") return `R$ ${Number(value).toFixed(6)}/kWh`;
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

export function FaturaDetail({ fatura }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable state — Identification
  const [denominacao, setDenominacao] = useState(fatura.denominacao ?? "");
  const [contrato, setContrato] = useState(fatura.contrato ?? "");
  const [inicioCiclo, setInicioCiclo] = useState(fatura.inicio_ciclo ?? "");
  const [fimCiclo, setFimCiclo] = useState(fatura.fim_ciclo ?? "");

  // Energia Fora Ponta
  const [energiaFaturadaFp, setEnergiaFaturadaFp] = useState(fatura.energia_faturada_fp?.toString() ?? "");
  const [valorTarifaFp, setValorTarifaFp] = useState(fatura.valor_tarifa_fp?.toString() ?? "");
  const [tarifaCompensadaFp, setTarifaCompensadaFp] = useState(fatura.tarifa_compensada_fp?.toString() ?? "");
  const [energiaConsumidaFp, setEnergiaConsumidaFp] = useState(fatura.energia_consumida_fp?.toString() ?? "");
  const [energiaInjetadaFp, setEnergiaInjetadaFp] = useState(fatura.energia_injetada_fp?.toString() ?? "");

  // Valores e totais
  const [valorTotal, setValorTotal] = useState(fatura.valor_total?.toString() ?? "");
  const [consumoKwh, setConsumoKwh] = useState(fatura.consumo_kwh?.toString() ?? "");
  const [energiaInjetadaKwh, setEnergiaInjetadaKwh] = useState(fatura.energia_injetada_kwh?.toString() ?? "");
  const [creditosEnergiaKwh, setCreditosEnergiaKwh] = useState(fatura.creditos_energia_kwh?.toString() ?? "");

  // Demanda e tarifas
  const [demandaContratadaKw, setDemandaContratadaKw] = useState(fatura.demanda_contratada_kw?.toString() ?? "");
  const [valorTusd, setValorTusd] = useState(fatura.valor_tusd?.toString() ?? "");
  const [valorTe, setValorTe] = useState(fatura.valor_te?.toString() ?? "");

  function resetForm() {
    setDenominacao(fatura.denominacao ?? "");
    setContrato(fatura.contrato ?? "");
    setInicioCiclo(fatura.inicio_ciclo ?? "");
    setFimCiclo(fatura.fim_ciclo ?? "");
    setEnergiaFaturadaFp(fatura.energia_faturada_fp?.toString() ?? "");
    setValorTarifaFp(fatura.valor_tarifa_fp?.toString() ?? "");
    setTarifaCompensadaFp(fatura.tarifa_compensada_fp?.toString() ?? "");
    setEnergiaConsumidaFp(fatura.energia_consumida_fp?.toString() ?? "");
    setEnergiaInjetadaFp(fatura.energia_injetada_fp?.toString() ?? "");
    setValorTotal(fatura.valor_total?.toString() ?? "");
    setConsumoKwh(fatura.consumo_kwh?.toString() ?? "");
    setEnergiaInjetadaKwh(fatura.energia_injetada_kwh?.toString() ?? "");
    setCreditosEnergiaKwh(fatura.creditos_energia_kwh?.toString() ?? "");
    setDemandaContratadaKw(fatura.demanda_contratada_kw?.toString() ?? "");
    setValorTusd(fatura.valor_tusd?.toString() ?? "");
    setValorTe(fatura.valor_te?.toString() ?? "");
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

    const updates: Record<string, string | number | null> = {
      denominacao: denominacao || null,
      contrato: contrato || null,
      inicio_ciclo: inicioCiclo || null,
      fim_ciclo: fimCiclo || null,
      energia_faturada_fp: parseNum(energiaFaturadaFp),
      valor_tarifa_fp: parseNum(valorTarifaFp),
      tarifa_compensada_fp: parseNum(tarifaCompensadaFp),
      energia_consumida_fp: parseNum(energiaConsumidaFp),
      energia_injetada_fp: parseNum(energiaInjetadaFp),
      valor_total: parseNum(valorTotal),
      consumo_kwh: parseNum(consumoKwh),
      energia_injetada_kwh: parseNum(energiaInjetadaKwh),
      creditos_energia_kwh: parseNum(creditosEnergiaKwh),
      demanda_contratada_kw: parseNum(demandaContratadaKw),
      valor_tusd: parseNum(valorTusd),
      valor_te: parseNum(valorTe),
    };

    const result = await updateFatura(fatura.id, updates);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Fatura atualizada com sucesso.");
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
          <Button variant="outline" size="sm" onClick={() => { resetForm(); setEditing(true); }}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Identification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.denominacao}</Label>
                  <Input value={denominacao} onChange={(e) => setDenominacao(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.contrato}</Label>
                  <Input value={contrato} onChange={(e) => setContrato(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.inicio_ciclo}</Label>
                  <Input type="date" value={inicioCiclo} onChange={(e) => setInicioCiclo(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.fim_ciclo}</Label>
                  <Input type="date" value={fimCiclo} onChange={(e) => setFimCiclo(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.denominacao} value={formatDisplayValue("denominacao", fatura.denominacao)} />
                <ReadonlyField label={FIELD_LABELS.contrato} value={formatDisplayValue("contrato", fatura.contrato)} />
                <ReadonlyField label={FIELD_LABELS.inicio_ciclo} value={formatDisplayValue("inicio_ciclo", fatura.inicio_ciclo)} />
                <ReadonlyField label={FIELD_LABELS.fim_ciclo} value={formatDisplayValue("fim_ciclo", fatura.fim_ciclo)} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Energia Fora Ponta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Energia Fora Ponta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.energia_faturada_fp}</Label>
                  <Input type="number" step="0.01" value={energiaFaturadaFp} onChange={(e) => setEnergiaFaturadaFp(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.valor_tarifa_fp}</Label>
                  <Input type="number" step="0.000001" value={valorTarifaFp} onChange={(e) => setValorTarifaFp(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.tarifa_compensada_fp}</Label>
                  <Input type="number" step="0.000001" value={tarifaCompensadaFp} onChange={(e) => setTarifaCompensadaFp(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.energia_consumida_fp}</Label>
                  <Input type="number" step="0.01" value={energiaConsumidaFp} onChange={(e) => setEnergiaConsumidaFp(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.energia_injetada_fp}</Label>
                  <Input type="number" step="0.01" value={energiaInjetadaFp} onChange={(e) => setEnergiaInjetadaFp(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.energia_faturada_fp} value={formatDisplayValue("energia_faturada_fp", fatura.energia_faturada_fp)} />
                <ReadonlyField label={FIELD_LABELS.valor_tarifa_fp} value={formatDisplayValue("valor_tarifa_fp", fatura.valor_tarifa_fp)} />
                <ReadonlyField label={FIELD_LABELS.tarifa_compensada_fp} value={formatDisplayValue("tarifa_compensada_fp", fatura.tarifa_compensada_fp)} />
                <ReadonlyField label={FIELD_LABELS.energia_consumida_fp} value={formatDisplayValue("energia_consumida_fp", fatura.energia_consumida_fp)} />
                <ReadonlyField label={FIELD_LABELS.energia_injetada_fp} value={formatDisplayValue("energia_injetada_fp", fatura.energia_injetada_fp)} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Valores e totais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valores e totais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.valor_total}</Label>
                  <Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.consumo_kwh}</Label>
                  <Input type="number" step="0.01" value={consumoKwh} onChange={(e) => setConsumoKwh(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.energia_injetada_kwh}</Label>
                  <Input type="number" step="0.01" value={energiaInjetadaKwh} onChange={(e) => setEnergiaInjetadaKwh(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.creditos_energia_kwh}</Label>
                  <Input type="number" step="0.01" value={creditosEnergiaKwh} onChange={(e) => setCreditosEnergiaKwh(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.valor_total} value={formatDisplayValue("valor_total", fatura.valor_total)} />
                <ReadonlyField label={FIELD_LABELS.consumo_kwh} value={formatDisplayValue("consumo_kwh", fatura.consumo_kwh)} />
                <ReadonlyField label={FIELD_LABELS.energia_injetada_kwh} value={formatDisplayValue("energia_injetada_kwh", fatura.energia_injetada_kwh)} />
                <ReadonlyField label={FIELD_LABELS.creditos_energia_kwh} value={formatDisplayValue("creditos_energia_kwh", fatura.creditos_energia_kwh)} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demanda e tarifas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demanda e tarifas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {editing ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.demanda_contratada_kw}</Label>
                  <Input type="number" step="0.01" value={demandaContratadaKw} onChange={(e) => setDemandaContratadaKw(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.valor_tusd}</Label>
                  <Input type="number" step="0.01" value={valorTusd} onChange={(e) => setValorTusd(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{FIELD_LABELS.valor_te}</Label>
                  <Input type="number" step="0.01" value={valorTe} onChange={(e) => setValorTe(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <ReadonlyField label={FIELD_LABELS.demanda_contratada_kw} value={formatDisplayValue("demanda_contratada_kw", fatura.demanda_contratada_kw)} />
                <ReadonlyField label={FIELD_LABELS.valor_tusd} value={formatDisplayValue("valor_tusd", fatura.valor_tusd)} />
                <ReadonlyField label={FIELD_LABELS.valor_te} value={formatDisplayValue("valor_te", fatura.valor_te)} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

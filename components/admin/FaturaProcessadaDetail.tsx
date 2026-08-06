"use client";

import { useReducer, useMemo, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateFaturaProcessada } from "@/lib/actions/faturas-processadas";
import { formatCurrency, formatKWh } from "@/lib/utils";
import type { FaturaProcessada } from "@/types/database";

// --- Types ---

type FPData = FaturaProcessada & {
  uc: { id: string; codigo_uc: string; titular: string; empresa: { id: string; nome: string } | null } | null;
};

type EditableFieldKey =
  | "consumo_total_kwh"
  | "consumo_ponta_kwh"
  | "consumo_fora_ponta_kwh"
  | "energia_injetada_kwh"
  | "consumo_injetado_mesma_uc_kwh"
  | "consumo_injetado_outra_uc_kwh"
  | "credito_acumulado_kwh"
  | "valor_total_fatura_rs"
  | "vto_ci_rs"
  | "numero_fatura"
  | "data_vencimento"
  | "tem_geracao_compartilhada"
  | "evidencia_geracao_compartilhada"
  | "observacao";

interface LogEntry {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  alterado_em: string;
  admin: { id: string; nome: string } | null;
}

interface Props {
  fp: FPData;
  editLog: LogEntry[];
}

// --- Constants ---

const FIELD_LABELS: Record<EditableFieldKey, string> = {
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

type FieldType = "number" | "text" | "date" | "switch" | "textarea";

const FIELD_TYPES: Record<EditableFieldKey, FieldType> = {
  consumo_total_kwh: "number",
  consumo_ponta_kwh: "number",
  consumo_fora_ponta_kwh: "number",
  energia_injetada_kwh: "number",
  consumo_injetado_mesma_uc_kwh: "number",
  consumo_injetado_outra_uc_kwh: "number",
  credito_acumulado_kwh: "number",
  valor_total_fatura_rs: "number",
  vto_ci_rs: "number",
  numero_fatura: "text",
  data_vencimento: "date",
  tem_geracao_compartilhada: "switch",
  evidencia_geracao_compartilhada: "textarea",
  observacao: "textarea",
};

// --- Reducer ---

type FormValues = Record<EditableFieldKey, string | boolean>;

interface FormState {
  values: FormValues;
  originalValues: FormValues;
  isDirty: boolean;
}

type FormAction =
  | { type: "SET_FIELD"; field: EditableFieldKey; value: string | boolean }
  | { type: "RESET" }
  | { type: "SYNC_ORIGINALS"; values: FormValues };

function initializeFormValues(fp: FPData): FormValues {
  return {
    consumo_total_kwh: fp.consumo_total_kwh?.toString() ?? "",
    consumo_ponta_kwh: fp.consumo_ponta_kwh?.toString() ?? "",
    consumo_fora_ponta_kwh: fp.consumo_fora_ponta_kwh?.toString() ?? "",
    energia_injetada_kwh: fp.energia_injetada_kwh?.toString() ?? "",
    consumo_injetado_mesma_uc_kwh: fp.consumo_injetado_mesma_uc_kwh?.toString() ?? "",
    consumo_injetado_outra_uc_kwh: fp.consumo_injetado_outra_uc_kwh?.toString() ?? "",
    credito_acumulado_kwh: fp.credito_acumulado_kwh?.toString() ?? "",
    valor_total_fatura_rs: fp.valor_total_fatura_rs?.toString() ?? "",
    vto_ci_rs: fp.vto_ci_rs?.toString() ?? "",
    numero_fatura: fp.numero_fatura ?? "",
    data_vencimento: fp.data_vencimento ?? "",
    tem_geracao_compartilhada: fp.tem_geracao_compartilhada,
    evidencia_geracao_compartilhada: fp.evidencia_geracao_compartilhada ?? "",
    observacao: fp.observacao ?? "",
  };
}

function computeIsDirty(values: FormValues, originalValues: FormValues): boolean {
  for (const key of Object.keys(values) as EditableFieldKey[]) {
    if (values[key] !== originalValues[key]) return true;
  }
  return false;
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD": {
      const newValues = { ...state.values, [action.field]: action.value };
      return { ...state, values: newValues, isDirty: computeIsDirty(newValues, state.originalValues) };
    }
    case "RESET":
      return { ...state, values: { ...state.originalValues }, isDirty: false };
    case "SYNC_ORIGINALS":
      return { values: { ...action.values }, originalValues: { ...action.values }, isDirty: false };
    default:
      return state;
  }
}

// --- Helpers ---

function formatDisplayValue(field: EditableFieldKey, value: unknown): string {
  if (value == null || value === "") return "—";
  if (field === "tem_geracao_compartilhada") return value ? "Sim" : "Não";
  if (field === "data_vencimento" && typeof value === "string") {
    return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
  }
  if (field.endsWith("_kwh")) return formatKWh(Number(value));
  if (field.endsWith("_rs")) return formatCurrency(Number(value));
  return String(value);
}

function parseFieldForSave(field: EditableFieldKey, value: string | boolean): string | number | boolean | null {
  if (FIELD_TYPES[field] === "switch") return value as boolean;
  const strVal = value as string;
  if (strVal === "") return null;
  if (FIELD_TYPES[field] === "number") {
    const n = parseFloat(strVal);
    return isNaN(n) ? null : n;
  }
  return strVal;
}

// --- InlineEditableField ---

interface InlineFieldProps {
  field: EditableFieldKey;
  value: string | boolean;
  fpValue: unknown;
  editInfo: { editedBy: string; editedAt: string } | null;
  onSave: (field: EditableFieldKey, value: string | boolean) => Promise<boolean>;
  validationError?: string;
}

function InlineEditableField({ field, value, fpValue, editInfo, onSave, validationError }: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);

  // Sync local value when prop changes (after server refresh)
  useEffect(() => {
    if (!editing) setLocalValue(value);
  }, [value, editing]);

  const fieldType = FIELD_TYPES[field];
  const label = FIELD_LABELS[field];
  const displayValue = formatDisplayValue(field, fpValue);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const success = await onSave(field, localValue);
    setSaving(false);
    if (success) setEditing(false);
  }, [field, localValue, onSave]);

  const handleCancel = useCallback(() => {
    setLocalValue(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && fieldType !== "textarea") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }, [fieldType, handleSave, handleCancel]);

  const indicatorEl = editInfo ? (
    <span title={`Editado por ${editInfo.editedBy} em ${new Date(editInfo.editedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}>
      <Pencil className="h-3 w-3 text-primary shrink-0" />
    </span>
  ) : (
    <span title="Valor extraído automaticamente">
      <Sparkles className="h-3 w-3 text-muted-foreground/50 shrink-0" />
    </span>
  );

  if (editing) {
    return (
      <div className={`space-y-1 ${editInfo ? "border-l-2 border-primary pl-3" : "pl-3"}`}>
        <div className="flex items-center gap-1.5">
          {indicatorEl}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {fieldType === "switch" ? (
            <div className="flex items-center gap-2 flex-1">
              <Switch
                checked={localValue as boolean}
                onCheckedChange={(v) => setLocalValue(v)}
              />
              <span className="text-sm">{localValue ? "Sim" : "Não"}</span>
            </div>
          ) : fieldType === "textarea" ? (
            <Textarea
              value={localValue as string}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="flex-1 text-sm"
              autoFocus
            />
          ) : (
            <Input
              type={fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text"}
              step={fieldType === "number" ? "0.01" : undefined}
              value={localValue as string}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-8 text-sm"
              autoFocus
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1 rounded hover:bg-muted text-primary disabled:opacity-50"
            title="Salvar"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
            title="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {validationError && (
          <p className="text-xs text-red-600">{validationError}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group space-y-1 cursor-pointer rounded-md px-3 py-1.5 -mx-3 hover:bg-muted/50 transition-colors ${editInfo ? "border-l-2 border-primary" : ""}`}
      onClick={() => setEditing(true)}
    >
      <div className="flex items-center gap-1.5">
        {indicatorEl}
        <p className="text-xs text-muted-foreground">{label}</p>
        <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors ml-auto shrink-0" />
      </div>
      <p className="text-sm font-medium text-foreground">{displayValue}</p>
    </div>
  );
}

// --- Main Component ---

export function FaturaProcessadaDetail({ fp, editLog }: Props) {
  const router = useRouter();

  const initialValues = useMemo(() => initializeFormValues(fp), [fp]);

  const [formState, dispatch] = useReducer(formReducer, {
    values: initialValues,
    originalValues: initialValues,
    isDirty: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Sync form when fp prop changes (after server refresh)
  useEffect(() => {
    const newValues = initializeFormValues(fp);
    dispatch({ type: "SYNC_ORIGINALS", values: newValues });
    setValidationErrors({});
  }, [fp]);

  // Beforeunload warning
  useEffect(() => {
    if (!formState.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [formState.isDirty]);

  // Build edited fields map from log
  const editedFieldsMap = useMemo(() => {
    const map: Record<string, { editedBy: string; editedAt: string }> = {};
    for (const entry of editLog) {
      // Keep the most recent edit per field (log is ordered desc)
      if (!map[entry.campo_alterado]) {
        map[entry.campo_alterado] = {
          editedBy: entry.admin?.nome ?? "Admin",
          editedAt: entry.alterado_em,
        };
      }
    }
    return map;
  }, [editLog]);

  const handleFieldSave = useCallback(async (field: EditableFieldKey, value: string | boolean): Promise<boolean> => {
    const parsedValue = parseFieldForSave(field, value);
    const updates = { [field]: parsedValue } as Record<string, string | number | boolean | null>;

    const result = await updateFaturaProcessada(fp.id, updates);

    if (result.validationErrors) {
      const errMap: Record<string, string> = {};
      for (const ve of result.validationErrors) {
        errMap[ve.field] = ve.message;
      }
      setValidationErrors(errMap);
      return false;
    }

    if (result.error) {
      toast.error(result.error);
      return false;
    }

    // Clear validation errors for this field
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    toast.success("Campo atualizado.");
    dispatch({ type: "SET_FIELD", field, value });
    router.refresh();
    return true;
  }, [fp.id, router]);

  function renderField(field: EditableFieldKey) {
    return (
      <InlineEditableField
        key={field}
        field={field}
        value={formState.values[field]}
        fpValue={(fp as unknown as Record<string, unknown>)[field]}
        editInfo={editedFieldsMap[field] ?? null}
        onSave={handleFieldSave}
        validationError={validationErrors[field]}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Consumo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {renderField("consumo_total_kwh")}
            {renderField("consumo_ponta_kwh")}
            {renderField("consumo_fora_ponta_kwh")}
          </CardContent>
        </Card>

        {/* Energia injetada e créditos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Energia injetada e créditos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {renderField("energia_injetada_kwh")}
            {renderField("consumo_injetado_mesma_uc_kwh")}
            {renderField("consumo_injetado_outra_uc_kwh")}
            {renderField("credito_acumulado_kwh")}
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {renderField("valor_total_fatura_rs")}
            {renderField("vto_ci_rs")}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Identificacao */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {renderField("numero_fatura")}
            {renderField("data_vencimento")}
          </CardContent>
        </Card>

        {/* Geracao compartilhada */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Geracao compartilhada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {renderField("tem_geracao_compartilhada")}
            {renderField("evidencia_geracao_compartilhada")}
          </CardContent>
        </Card>
      </div>

      {/* Observacao */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observacao</CardTitle>
        </CardHeader>
        <CardContent>
          {renderField("observacao")}
        </CardContent>
      </Card>
    </div>
  );
}

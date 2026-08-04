"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sun, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateParametrosEstimativa } from "@/lib/actions/unidades";
import type { UCSectionHandle } from "@/types/uc-section";

interface Props {
  ucId: string;
  initial: {
    fator_rendimento: number | null;
    degradacao_ano_zero: number | null;
    degradacao_anos_seguintes: number | null;
    data_inicio_degradacao: string | null;
  };
  onChangeStatus?: () => void;
}

export const UCParametrosEstimativa = forwardRef<UCSectionHandle, Props>(function UCParametrosEstimativa({ ucId, initial, onChangeStatus }, ref) {
  const router = useRouter();

  const [dataInicioDegradacao, setDataInicioDegradacao] = useState(
    initial.data_inicio_degradacao ?? ""
  );
  const [fatorRendimento, setFatorRendimento] = useState(
    initial.fator_rendimento?.toString() ?? ""
  );
  const [degradacaoAnoZero, setDegradacaoAnoZero] = useState(
    initial.degradacao_ano_zero?.toString() ?? ""
  );
  const [degradacaoAnosSeguintes, setDegradacaoAnosSeguintes] = useState(
    initial.degradacao_anos_seguintes?.toString() ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    dataInicioDegradacao !== (initial.data_inicio_degradacao ?? "") ||
    fatorRendimento !== (initial.fator_rendimento?.toString() ?? "") ||
    degradacaoAnoZero !== (initial.degradacao_ano_zero?.toString() ?? "") ||
    degradacaoAnosSeguintes !==
      (initial.degradacao_anos_seguintes?.toString() ?? "");

  const isIncomplete = !fatorRendimento || !degradacaoAnoZero || !degradacaoAnosSeguintes;

  useImperativeHandle(ref, () => ({
    save: handleSave,
    hasChanges,
  }), [hasChanges]);

  useEffect(() => {
    onChangeStatus?.();
  }, [hasChanges, onChangeStatus]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const result = await updateParametrosEstimativa(ucId, {
      data_inicio_degradacao: dataInicioDegradacao || null,
      fator_rendimento: fatorRendimento ? parseFloat(fatorRendimento) : null,
      degradacao_ano_zero: degradacaoAnoZero
        ? parseFloat(degradacaoAnoZero)
        : null,
      degradacao_anos_seguintes: degradacaoAnosSeguintes
        ? parseFloat(degradacaoAnosSeguintes)
        : null,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">
              Parâmetros de geração estimada
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600">Salvo!</span>}
            <Button
              size="sm"
              disabled={!hasChanges || saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-2 h-3.5 w-3.5" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIncomplete && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              A geração estimada não será calculada sem estes parâmetros
              preenchidos.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="data_inicio_degradacao">Data início degradação</Label>
            <Input
              id="data_inicio_degradacao"
              type="date"
              value={dataInicioDegradacao}
              onChange={(e) => {
                setDataInicioDegradacao(e.target.value);
                setSaved(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Início da contagem de degradação
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fator_rendimento">Fator de rendimento</Label>
            <Input
              id="fator_rendimento"
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder="Ex: 0.95"
              value={fatorRendimento}
              onChange={(e) => {
                setFatorRendimento(e.target.value);
                setSaved(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Perdas da instalação (0 a 1)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="degradacao_ano_zero">Degradação 1&ordm; ano</Label>
            <Input
              id="degradacao_ano_zero"
              type="number"
              step="0.001"
              min="0"
              max="1"
              placeholder="Ex: 0.02"
              value={degradacaoAnoZero}
              onChange={(e) => {
                setDegradacaoAnoZero(e.target.value);
                setSaved(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Ex: 0.02 = 2% no primeiro ano
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="degradacao_anos_seguintes">
              Degradação anual seguinte
            </Label>
            <Input
              id="degradacao_anos_seguintes"
              type="number"
              step="0.001"
              min="0"
              max="1"
              placeholder="Ex: 0.006"
              value={degradacaoAnosSeguintes}
              onChange={(e) => {
                setDegradacaoAnosSeguintes(e.target.value);
                setSaved(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Ex: 0.006 = 0,6% a partir do 2&ordm; ano
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  );
});

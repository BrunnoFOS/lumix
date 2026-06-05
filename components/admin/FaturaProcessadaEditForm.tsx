"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  regerarRelatorioFatura,
  type CamposEditaveis,
} from "@/lib/actions/faturas-processadas";

interface FaturaData {
  id: string;
  consumo_total_kwh: number | null;
  consumo_ponta_kwh: number | null;
  consumo_fora_ponta_kwh: number | null;
  energia_injetada_kwh: number | null;
  consumo_injetado_mesma_uc_kwh: number | null;
  consumo_injetado_outra_uc_kwh: number | null;
  credito_acumulado_kwh: number | null;
  valor_total_fatura_rs: number | null;
  vto_ci_rs: number | null;
  tem_geracao_compartilhada: boolean;
  evidencia_geracao_compartilhada: string | null;
  data_vencimento: string | null;
  numero_fatura: string | null;
  observacao: string | null;
}

interface Props {
  fatura: FaturaData;
  isGrupoA: boolean;
  adminId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NumericField({
  id,
  label,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? "pr-16" : ""}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function FaturaProcessadaEditForm({
  fatura,
  isGrupoA,
  adminId,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();

  const [consumoTotal, setConsumoTotal] = useState(fatura.consumo_total_kwh?.toString() ?? "");
  const [consumoPonta, setConsumoPonta] = useState(fatura.consumo_ponta_kwh?.toString() ?? "");
  const [consumoForaPonta, setConsumoForaPonta] = useState(fatura.consumo_fora_ponta_kwh?.toString() ?? "");
  const [energiaInjetada, setEnergiaInjetada] = useState(fatura.energia_injetada_kwh?.toString() ?? "");
  const [consumoInjetadoMesma, setConsumoInjetadoMesma] = useState(fatura.consumo_injetado_mesma_uc_kwh?.toString() ?? "");
  const [consumoInjetadoOutra, setConsumoInjetadoOutra] = useState(fatura.consumo_injetado_outra_uc_kwh?.toString() ?? "");
  const [creditoAcumulado, setCreditoAcumulado] = useState(fatura.credito_acumulado_kwh?.toString() ?? "");
  const [valorTotal, setValorTotal] = useState(fatura.valor_total_fatura_rs?.toString() ?? "");
  const [vtoCi, setVtoCi] = useState(fatura.vto_ci_rs?.toString() ?? "");
  const [temGeracaoCompartilhada, setTemGeracaoCompartilhada] = useState(fatura.tem_geracao_compartilhada);
  const [numeroFatura, setNumeroFatura] = useState(fatura.numero_fatura ?? "");
  const [dataVencimento, setDataVencimento] = useState(fatura.data_vencimento ?? "");
  const [observacao, setObservacao] = useState(fatura.observacao ?? "");

  const [confirmando, setConfirmando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function parseNum(v: string): number | null {
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function getCamposEditados(): CamposEditaveis {
    return {
      consumo_total_kwh: parseNum(consumoTotal),
      consumo_ponta_kwh: parseNum(consumoPonta),
      consumo_fora_ponta_kwh: parseNum(consumoForaPonta),
      energia_injetada_kwh: parseNum(energiaInjetada),
      consumo_injetado_mesma_uc_kwh: parseNum(consumoInjetadoMesma),
      consumo_injetado_outra_uc_kwh: parseNum(consumoInjetadoOutra),
      credito_acumulado_kwh: parseNum(creditoAcumulado),
      valor_total_fatura_rs: parseNum(valorTotal),
      vto_ci_rs: parseNum(vtoCi),
      tem_geracao_compartilhada: temGeracaoCompartilhada,
      numero_fatura: numeroFatura || null,
      data_vencimento: dataVencimento || null,
      observacao: observacao || null,
    };
  }

  async function handleRegerar() {
    setGerando(true);
    setErro(null);
    setSucesso(null);

    const result = await regerarRelatorioFatura(
      fatura.id,
      getCamposEditados(),
      adminId
    );

    setGerando(false);
    setConfirmando(false);

    if (result.error) {
      setErro(result.error);
    } else {
      setSucesso(result.pdf_url ?? null);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !gerando && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar e regerar relatório</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Consumo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Consumo (kWh)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumericField
                id="consumo_total"
                label="Consumo total"
                value={consumoTotal}
                onChange={setConsumoTotal}
                suffix="kWh"
              />
              {isGrupoA && (
                <>
                  <NumericField
                    id="consumo_ponta"
                    label="Consumo ponta"
                    value={consumoPonta}
                    onChange={setConsumoPonta}
                    suffix="kWh"
                  />
                  <NumericField
                    id="consumo_fora_ponta"
                    label="Consumo fora ponta"
                    value={consumoForaPonta}
                    onChange={setConsumoForaPonta}
                    suffix="kWh"
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Geração e Créditos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Geração e créditos (kWh)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumericField
                id="energia_injetada"
                label="Energia injetada"
                value={energiaInjetada}
                onChange={setEnergiaInjetada}
                suffix="kWh"
              />
              <NumericField
                id="consumo_injetado_mesma"
                label="Consumo injetado — Mesma UC"
                value={consumoInjetadoMesma}
                onChange={setConsumoInjetadoMesma}
                suffix="kWh"
              />
              <NumericField
                id="consumo_injetado_outra"
                label="Consumo injetado — Outra UC"
                value={consumoInjetadoOutra}
                onChange={setConsumoInjetadoOutra}
                suffix="kWh"
              />
              <NumericField
                id="credito_acumulado"
                label="Crédito acumulado"
                value={creditoAcumulado}
                onChange={setCreditoAcumulado}
                suffix="kWh"
              />
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Valores (R$)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumericField
                id="valor_total"
                label="Valor total da fatura"
                value={valorTotal}
                onChange={setValorTotal}
                suffix="R$"
              />
              <NumericField
                id="vto_ci"
                label="VTO.CI"
                value={vtoCi}
                onChange={setVtoCi}
                suffix="R$"
              />
            </CardContent>
          </Card>

          {/* Geração compartilhada */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Geração compartilhada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={temGeracaoCompartilhada}
                  onCheckedChange={setTemGeracaoCompartilhada}
                />
                <Label>Tem geração compartilhada?</Label>
              </div>
              {fatura.evidencia_geracao_compartilhada && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    Evidência extraída da fatura:
                  </p>
                  <p className="text-xs text-amber-700">
                    {fatura.evidencia_geracao_compartilhada}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados da fatura */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados da fatura</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="numero_fatura">Número da fatura</Label>
                <Input
                  id="numero_fatura"
                  value={numeroFatura}
                  onChange={(e) => setNumeroFatura(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="data_vencimento">Data de vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Observação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observação</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Fatura com leitura estimada. Dados ajustados manualmente."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Erros e sucesso */}
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          {sucesso !== null && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 flex items-center justify-between">
              <span>Relatório regerado com sucesso.</span>
              {sucesso && (
                <a
                  href={sucesso}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-green-700 font-medium hover:underline"
                >
                  Visualizar <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Ações */}
          {!confirmando ? (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={gerando}
              >
                Cancelar
              </Button>
              <Button onClick={() => setConfirmando(true)} disabled={gerando}>
                Regerar relatório
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Atenção</p>
                  <p className="text-sm text-amber-700">
                    Ao regerar, o relatório atual será substituído permanentemente.
                    Essa ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmando(false)}
                  disabled={gerando}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleRegerar}
                  disabled={gerando}
                >
                  {gerando ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Gerando relatório…
                    </>
                  ) : (
                    "Confirmar e regerar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

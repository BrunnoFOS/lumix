"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Zap, Activity, TrendingUp, Target, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { confirmarFaturaCliente } from "@/lib/actions/faturas";
import { fetchGeracaoMensal } from "@/lib/actions/solis";
import type { SolisGeracaoMensal } from "@/lib/actions/solis";

interface Props {
  faturaId: string;
  ucCodigo: string;
  mesReferencia: string;
  mesReferenciaRaw: string;
  stationId: string | null;
}

function formatKwh(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function FaturaConfirmButton({ faturaId, ucCodigo, mesReferencia, mesReferenciaRaw, stationId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [open, setOpen] = useState(false);

  // Dados de geracao
  const [geracao, setGeracao] = useState<SolisGeracaoMensal | null>(null);
  const [loadingGeracao, setLoadingGeracao] = useState(false);
  const [geracaoError, setGeracaoError] = useState<string | null>(null);

  // Datas do ciclo
  const [inicioCiclo, setInicioCiclo] = useState("");
  const [fimCiclo, setFimCiclo] = useState("");

  // Inicializar datas do ciclo a partir do mes_referencia
  useEffect(() => {
    if (open && mesReferenciaRaw) {
      const [y, m] = mesReferenciaRaw.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const mesStr = `${y}-${String(m).padStart(2, "0")}`;
      setInicioCiclo(`${mesStr}-01`);
      setFimCiclo(`${mesStr}-${String(lastDay).padStart(2, "0")}`);
    }
  }, [open, mesReferenciaRaw]);

  // Limpar dados de geração quando datas mudarem
  useEffect(() => {
    setGeracao(null);
    setGeracaoError(null);
  }, [inicioCiclo, fimCiclo]);

  // Limpar estado ao fechar
  useEffect(() => {
    if (!open) {
      setGeracao(null);
      setGeracaoError(null);
      setLoadingGeracao(false);
    }
  }, [open]);

  async function buscarGeracao() {
    if (!stationId || !inicioCiclo || !fimCiclo) return;

    setLoadingGeracao(true);
    setGeracaoError(null);

    const month = fimCiclo.slice(0, 7);

    let result = await fetchGeracaoMensal(stationId, month, "solis", inicioCiclo, fimCiclo);
    if (result.error || !result.data) {
      result = await fetchGeracaoMensal(stationId, month, "sungrow", inicioCiclo, fimCiclo);
    }

    if (result.error) {
      setGeracaoError(result.error);
      setGeracao(null);
    } else {
      setGeracao(result.data);
    }
    setLoadingGeracao(false);
  }

  async function handleConfirm() {
    setConfirming(true);

    const extras = geracao
      ? { dadosGeracao: geracao, stationId: stationId ?? undefined }
      : undefined;

    const result = await confirmarFaturaCliente(faturaId, extras);

    setConfirming(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Fatura confirmada. O relatório será gerado automaticamente.");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" />
        }
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Confirmar geração
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar geração de relatório</DialogTitle>
          <DialogDescription>
            UC <strong>{ucCodigo}</strong> — {mesReferencia}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aviso sem station_id */}
          {!stationId && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                UC sem vinculação com provedor. A confirmação será enviada sem dados de geração.
              </p>
            </div>
          )}

          {/* Datas do ciclo */}
          {stationId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="inicio_ciclo" className="text-xs text-muted-foreground">
                  Início do ciclo
                </Label>
                <Input
                  id="inicio_ciclo"
                  type="date"
                  value={inicioCiclo}
                  onChange={(e) => setInicioCiclo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fim_ciclo" className="text-xs text-muted-foreground">
                  Fim do ciclo
                </Label>
                <Input
                  id="fim_ciclo"
                  type="date"
                  value={fimCiclo}
                  onChange={(e) => setFimCiclo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Botão buscar */}
          {stationId && !geracao && !loadingGeracao && !geracaoError && (
            <Button
              type="button"
              variant="outline"
              onClick={buscarGeracao}
              disabled={!inicioCiclo || !fimCiclo}
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar dados de geração
            </Button>
          )}

          {/* Loading */}
          {loadingGeracao && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Buscando dados de geração...</span>
            </div>
          )}

          {/* Erro */}
          {geracaoError && !loadingGeracao && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{geracaoError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs"
                  onClick={buscarGeracao}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {/* Cards de geracao */}
          {geracao && !loadingGeracao && (
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={buscarGeracao}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Rebuscar
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Geração total</span>
                </div>
                <p className="mt-1 text-xl font-bold">
                  {formatKwh(geracao.totais.geracao_kwh)} kWh
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Média diária</span>
                </div>
                <p className="mt-1 text-xl font-bold">
                  {formatKwh(geracao.metricas.media_diaria_kwh)} kWh
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Melhor dia</span>
                </div>
                <p className="mt-1 text-xl font-bold">
                  {formatKwh(geracao.metricas.melhor_dia.geracao_kwh)} kWh
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Projeção mês</span>
                </div>
                <p className="mt-1 text-xl font-bold">
                  {formatKwh(geracao.projecao.kwh_mes_completo)} kWh
                </p>
              </div>
            </div>
            </div>
          )}

          {/* Mensagem de contexto */}
          <p className="text-sm text-muted-foreground">
            Ao confirmar, o processamento será iniciado automaticamente. O sistema extrairá os dados e gerará o relatório.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={confirming}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming || loadingGeracao}
            className="bg-green-600 hover:bg-green-700"
          >
            {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

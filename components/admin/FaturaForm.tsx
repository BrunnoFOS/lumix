"use client";

import { useActionState, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Zap, Activity, TrendingUp, Target, CheckCircle2, AlertTriangle, X, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/shared/FileUpload";
import { createFaturaComGeracao } from "@/lib/actions/faturas";
import { fetchGeracaoMensal } from "@/lib/actions/solis";
import { createClient } from "@/lib/supabase/client";
import { useFaturaProcessamento } from "@/hooks/use-fatura-processamento";
import type { SolisGeracaoMensal } from "@/lib/actions/solis";

interface UC {
  id: string;
  codigo_uc: string;
  station_id: string | null;
  empresa: { id: string; nome: string } | null;
}

interface FormState {
  error?: string;
  data?: { id: string; uc_id?: string; mes_referencia?: string };
}

interface Cliente {
  id: string;
  nome: string;
}

function formatKwh(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function FaturaForm({ ucs, clientes = [] }: { ucs: UC[]; clientes?: Cliente[] }) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clienteId, setClienteId] = useState<string>("");
  const [ucId, setUcId] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [inicioCiclo, setInicioCiclo] = useState<string>("");
  const [fimCiclo, setFimCiclo] = useState<string>("");

  // Dados de geração
  const [geracao, setGeracao] = useState<SolisGeracaoMensal | null>(null);
  const [loadingGeracao, setLoadingGeracao] = useState(false);
  const [geracaoError, setGeracaoError] = useState<string | null>(null);

  const { status: processingStatus, start: startPolling, dismiss } = useFaturaProcessamento();
  const selectedUC = ucs.find((u) => u.id === ucId);

  // Preencher datas do ciclo quando mês muda
  useEffect(() => {
    if (mes) {
      const [y, m] = mes.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      setInicioCiclo(`${mes}-01`);
      setFimCiclo(`${mes}-${String(lastDay).padStart(2, "0")}`);
    }
  }, [mes]);

  // Limpar dados de geração quando UC ou ciclo mudarem
  useEffect(() => {
    setGeracao(null);
    setGeracaoError(null);
  }, [ucId, inicioCiclo, fimCiclo]);

  // Buscar geração sob demanda (botão)
  async function buscarGeracao() {
    if (!ucId || !inicioCiclo || !fimCiclo) return;

    const uc = ucs.find((u) => u.id === ucId);
    if (!uc?.station_id) {
      setGeracaoError("UC sem vinculação com provedor (sem station_id).");
      return;
    }

    setLoadingGeracao(true);
    setGeracaoError(null);

    const month = fimCiclo.slice(0, 7);

    let result = await fetchGeracaoMensal(uc.station_id, month, "solis", inicioCiclo, fimCiclo);
    if (result.error || !result.data) {
      result = await fetchGeracaoMensal(uc.station_id, month, "sungrow", inicioCiclo, fimCiclo);
    }

    if (result.error) {
      setGeracaoError(result.error);
      setGeracao(null);
    } else {
      setGeracao(result.data);
    }
    setLoadingGeracao(false);
  }

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState | null, formData: FormData): Promise<FormState> => {
      const mesInput = formData.get("mes_referencia") as string;
      if (mesInput && !mesInput.endsWith("-01")) {
        formData.set("mes_referencia", `${mesInput}-01`);
      }

      // Upload file to Storage if selected
      if (selectedFile) {
        try {
          const supabase = createClient();
          const ext = selectedFile.name.split(".").pop();
          const fileName = `admin/${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("faturas")
            .upload(fileName, selectedFile, { upsert: true });

          if (uploadError) {
            return { error: "Erro ao fazer upload do arquivo. Tente novamente." };
          }

          const { data: urlData } = supabase.storage
            .from("faturas")
            .getPublicUrl(fileName);

          const isPdf = selectedFile.type === "application/pdf";
          if (isPdf) {
            formData.set("pdf_url", urlData.publicUrl);
          } else {
            formData.set("imagem_url", urlData.publicUrl);
          }
        } catch {
          return { error: "Erro inesperado no upload do arquivo." };
        }
      }

      if (geracao) formData.set("dados_geracao", JSON.stringify(geracao));
      if (selectedUC?.station_id) formData.set("station_id", selectedUC.station_id);

      try {
        return await createFaturaComGeracao(formData);
      } catch {
        return { error: "Erro de conexão ao salvar fatura. Tente novamente." };
      }
    },
    null
  );

  const hasHandledSuccess = useRef(false);
  useEffect(() => {
    if (state?.data?.id && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true;

      if (selectedFile && state.data.uc_id && state.data.mes_referencia) {
        // Arquivo enviado → relatório será gerado automaticamente
        toast.success("Fatura enviada! Gerando relatório automaticamente...");
        startPolling(state.data.uc_id, state.data.mes_referencia);
      } else {
        // Sem arquivo → só redirecionar
        toast.success("Fatura salva com sucesso!", {
          description: "Redirecionando para a lista de faturas...",
        });
        setTimeout(() => {
          router.push("/admin/faturas");
        }, 1500);
      }
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router, selectedFile, startPolling]);

  // Redirecionar quando processamento concluir com sucesso
  useEffect(() => {
    if (processingStatus === "success") {
      toast.success("Relatório gerado com sucesso!");
      setTimeout(() => {
        router.push("/admin/faturas");
      }, 2000);
    }
  }, [processingStatus, router]);

  const ucsFiltradas = clienteId
    ? ucs.filter((uc) => uc.empresa?.id === clienteId)
    : ucs;

  const clienteOptions = clientes.map((c) => ({ value: c.id, label: c.nome }));
  const ucOptions = ucsFiltradas.map((uc) => ({
    value: uc.id,
    label: `${uc.codigo_uc}${uc.empresa ? ` — ${uc.empresa.nome}` : ""}`,
  }));

  return (
    <>
      {processingStatus === "polling" && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-orange-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Relatório em processamento
            </p>
            <p className="text-xs text-orange-600">
              Aguardando geração automática. Você será notificado quando concluir.
            </p>
          </div>
        </div>
      )}

      {processingStatus === "success" && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="flex-1 text-sm font-medium text-emerald-800">
            Relatório gerado com sucesso! Redirecionando...
          </p>
        </div>
      )}

      {processingStatus === "timeout" && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Tempo limite excedido
            </p>
            <p className="text-xs text-red-600">
              O relatório não foi gerado em 5 minutos. Verifique na aba de relatórios.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

    <form action={formAction}>
      {state?.error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da fatura</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {clientes.length > 0 && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Combobox
                  options={clienteOptions}
                  value={clienteId}
                  onChange={(v) => { setClienteId(v); setUcId(""); }}
                  placeholder="Buscar cliente..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="uc_id">Unidade consumidora *</Label>
              <Combobox
                name="uc_id"
                options={ucOptions}
                value={ucId}
                onChange={setUcId}
                placeholder="Buscar UC..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mes_referencia">Mês da fatura *</Label>
              <Input
                id="mes_referencia"
                name="mes_referencia"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inicio_ciclo">Início do ciclo</Label>
              <Input
                id="inicio_ciclo"
                name="inicio_ciclo"
                type="date"
                value={inicioCiclo}
                onChange={(e) => setInicioCiclo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fim_ciclo">Fim do ciclo</Label>
              <Input
                id="fim_ciclo"
                name="fim_ciclo"
                type="date"
                value={fimCiclo}
                onChange={(e) => setFimCiclo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados de geração */}
        {ucId && mes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-primary" />
                Dados de geração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!geracao && !loadingGeracao && !geracaoError && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={buscarGeracao}
                  disabled={!selectedUC?.station_id}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Buscar dados de geração
                </Button>
              )}

              {!selectedUC?.station_id && !loadingGeracao && !geracao && (
                <p className="text-sm text-amber-600">
                  UC sem vinculação com provedor (sem station_id).
                </p>
              )}

              {loadingGeracao && (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando dados de geração do provedor...
                </div>
              )}

              {geracaoError && !loadingGeracao && (
                <div className="flex items-center gap-2 py-2">
                  <p className="text-sm text-amber-600">{geracaoError}</p>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={buscarGeracao}>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Tentar novamente
                  </Button>
                </div>
              )}

              {geracao && !loadingGeracao && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Dados encontrados
                    </Badge>
                    <span className="text-muted-foreground">
                      {geracao.periodo.dias_com_dados}/{geracao.periodo.dias_do_mes} dias com dados
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={buscarGeracao}>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Rebuscar
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">Geração total</span>
                      </div>
                      <p className="mt-1 text-xl font-bold">{formatKwh(geracao.totais.geracao_kwh)} kWh</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Média diária</span>
                      </div>
                      <p className="mt-1 text-xl font-bold">{formatKwh(geracao.metricas.media_diaria_kwh)} kWh</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">Melhor dia</span>
                      </div>
                      <p className="mt-1 text-xl font-bold">{formatKwh(geracao.metricas.melhor_dia.geracao_kwh)} kWh</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Projeção mês</span>
                      </div>
                      <p className="mt-1 text-xl font-bold">{formatKwh(geracao.projecao.kwh_mes_completo)} kWh</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Arquivo da fatura</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              label="Arraste o PDF ou imagem da fatura"
              onFileSelect={setSelectedFile}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending || processingStatus === "polling"}>
            {isPending ? "Salvando..." : "Inserir fatura"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
    </>
  );
}

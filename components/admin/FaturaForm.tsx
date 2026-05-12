"use client";

import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Activity, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/shared/FileUpload";
import { createFaturaComGeracao } from "@/lib/actions/faturas";
import { fetchGeracaoMensal } from "@/lib/actions/solis";
import type { SolisGeracaoMensal } from "@/lib/actions/solis";

interface UC {
  id: string;
  codigo_uc: string;
  station_id: string | null;
  empresa: { id: string; nome: string } | null;
}

interface FormState {
  error?: string;
  data?: { id: string };
}

interface Cliente {
  id: string;
  nome: string;
}

const selectClass =
  "flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatKwh(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function FaturaForm({ ucs, clientes = [] }: { ucs: UC[]; clientes?: Cliente[] }) {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string>("");
  const [ucId, setUcId] = useState<string>("");
  const [mes, setMes] = useState<string>("");

  // Dados de geração
  const [geracao, setGeracao] = useState<SolisGeracaoMensal | null>(null);
  const [loadingGeracao, setLoadingGeracao] = useState(false);
  const [geracaoError, setGeracaoError] = useState<string | null>(null);

  const selectedUC = ucs.find((u) => u.id === ucId);

  // Buscar geração quando UC + mês mudarem
  const buscarGeracao = useCallback(async () => {
    if (!ucId || !mes) {
      setGeracao(null);
      return;
    }

    const uc = ucs.find((u) => u.id === ucId);
    if (!uc?.station_id) {
      setGeracao(null);
      setGeracaoError("UC sem vinculação com provedor (sem station_id).");
      return;
    }

    setLoadingGeracao(true);
    setGeracaoError(null);

    // Detectar provider pelo station_id (Solis tem IDs longos, SunGrow curtos)
    // Por enquanto tenta solis primeiro, fallback sungrow
    let result = await fetchGeracaoMensal(uc.station_id, mes, "solis");
    if (result.error || !result.data) {
      result = await fetchGeracaoMensal(uc.station_id, mes, "sungrow");
    }

    if (result.error) {
      setGeracaoError(result.error);
      setGeracao(null);
    } else {
      setGeracao(result.data);
    }
    setLoadingGeracao(false);
  }, [ucId, mes, ucs]);

  useEffect(() => {
    buscarGeracao();
  }, [buscarGeracao]);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState | null, formData: FormData): Promise<FormState> => {
      const mesInput = formData.get("mes_referencia") as string;
      if (mesInput && !mesInput.endsWith("-01")) {
        formData.set("mes_referencia", `${mesInput}-01`);
      }
      if (pdfUrl) formData.set("pdf_url", pdfUrl);
      if (imagemUrl) formData.set("imagem_url", imagemUrl);
      if (geracao) formData.set("dados_geracao", JSON.stringify(geracao));
      if (selectedUC?.station_id) formData.set("station_id", selectedUC.station_id);
      return await createFaturaComGeracao(formData);
    },
    null
  );

  useEffect(() => {
    if (state?.data?.id) {
      router.push("/admin/faturas");
    }
  }, [state, router]);

  const ucsFiltradas = clienteId
    ? ucs.filter((uc) => uc.empresa?.id === clienteId)
    : ucs;

  return (
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
                <select
                  value={clienteId}
                  onChange={(e) => { setClienteId(e.target.value); setUcId(""); }}
                  className={selectClass}
                >
                  <option value="">Todos os clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="uc_id">Unidade consumidora *</Label>
              <select
                name="uc_id"
                value={ucId}
                onChange={(e) => setUcId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">Selecione a UC</option>
                {ucsFiltradas.map((uc) => (
                  <option key={uc.id} value={uc.id}>
                    {uc.codigo_uc}{uc.empresa ? ` — ${uc.empresa.nome}` : ""}
                  </option>
                ))}
              </select>
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
            <CardContent>
              {loadingGeracao ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando dados de geração do provedor...
                </div>
              ) : geracaoError ? (
                <div className="py-2 text-sm text-amber-600">{geracaoError}</div>
              ) : geracao ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Dados encontrados
                    </Badge>
                    <span className="text-muted-foreground">
                      {geracao.periodo.dias_com_dados}/{geracao.periodo.dias_do_mes} dias com dados
                    </span>
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
              ) : (
                <p className="py-2 text-sm text-muted-foreground">
                  Selecione uma UC vinculada e o mês para buscar os dados de geração.
                </p>
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
              bucket="faturas"
              path={`admin/${Date.now()}`}
              label="Arraste o PDF ou imagem da fatura"
              onUpload={(url, isPdf) => {
                if (isPdf) {
                  setPdfUrl(url);
                  setImagemUrl(null);
                } else {
                  setImagemUrl(url);
                  setPdfUrl(null);
                }
              }}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Inserir fatura"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}

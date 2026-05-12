"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { updateClassificacaoTarifaria } from "@/lib/actions/unidades";
import {
  getOpcoesTarifarias,
  lookupTarifas,
  type TarifaOpcoes,
  type TarifaLookupResult,
} from "@/lib/actions/tarifas-aneel";

const GRUPOS = [
  { value: "grupo_a", label: "Grupo A (Alta tensão)" },
  { value: "grupo_b", label: "Grupo B (Baixa tensão)" },
  { value: "acl", label: "ACL (Mercado Livre)" },
];

const selectClass =
  "flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

interface Props {
  ucId: string;
  initial: {
    grupo_tarifario: string | null;
    subgrupo: string | null;
    concessionaria_sigla: string | null;
    modalidade_tarifaria_aneel: string | null;
  };
  opcoesTarifarias: TarifaOpcoes;
}

export function UCClassificacaoTarifaria({ ucId, initial, opcoesTarifarias }: Props) {
  const router = useRouter();

  const [grupo, setGrupo] = useState(initial.grupo_tarifario ?? "");
  const [subgrupo, setSubgrupo] = useState(initial.subgrupo ?? "");
  const [concessionaria, setConcessionaria] = useState(initial.concessionaria_sigla ?? "");
  const [modalidade, setModalidade] = useState(initial.modalidade_tarifaria_aneel ?? "");

  const [opcoes, setOpcoes] = useState<TarifaOpcoes>(opcoesTarifarias);
  const [tarifas, setTarifas] = useState<TarifaLookupResult[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isAcl = grupo === "acl";

  // Cascata de opções
  useEffect(() => {
    if (isAcl) return;
    async function refresh() {
      const result = await getOpcoesTarifarias({
        grupo: grupo || undefined,
        subgrupo: subgrupo || undefined,
        sigla: concessionaria || undefined,
      });
      setOpcoes(result);
    }
    refresh();
  }, [grupo, subgrupo, concessionaria, isAcl]);

  // Lookup de tarifas
  const doLookup = useCallback(async () => {
    if (!concessionaria || !subgrupo || isAcl) {
      setTarifas([]);
      return;
    }
    setLoadingTarifas(true);
    const result = await lookupTarifas(concessionaria, subgrupo, modalidade || null);
    setTarifas(result);
    setLoadingTarifas(false);
  }, [concessionaria, subgrupo, modalidade, isAcl]);

  useEffect(() => {
    doLookup();
  }, [doLookup]);

  function handleGrupoChange(novoGrupo: string) {
    setGrupo(novoGrupo);
    setSubgrupo("");
    setConcessionaria(novoGrupo === "acl" ? "ACL" : "");
    setModalidade("");
    setTarifas([]);
    setSaved(false);
  }

  function handleSubgrupoChange(v: string) {
    setSubgrupo(v);
    setModalidade("");
    setTarifas([]);
    setSaved(false);
  }

  function handleConcessionariaChange(v: string) {
    setConcessionaria(v);
    setModalidade("");
    setTarifas([]);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateClassificacaoTarifaria(ucId, {
      grupo_tarifario: grupo || null,
      subgrupo: subgrupo || null,
      concessionaria_sigla: concessionaria || null,
      modalidade_tarifaria_aneel: modalidade || null,
    });
    setSaving(false);

    if (!result.error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const hasChanges =
    grupo !== (initial.grupo_tarifario ?? "") ||
    subgrupo !== (initial.subgrupo ?? "") ||
    concessionaria !== (initial.concessionaria_sigla ?? "") ||
    modalidade !== (initial.modalidade_tarifaria_aneel ?? "");

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Classificação tarifária</CardTitle>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-600">Salvo!</span>
            )}
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
      <CardContent className="space-y-4 overflow-visible">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Grupo tarifário</Label>
            <select
              value={grupo}
              onChange={(e) => handleGrupoChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Selecione</option>
              {GRUPOS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Subgrupo</Label>
            <Combobox
              options={opcoes.subgrupos}
              value={subgrupo}
              onChange={handleSubgrupoChange}
              placeholder={isAcl ? "N/A" : "Buscar subgrupo..."}
              disabled={!grupo || isAcl}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Concessionária (sigla)</Label>
            <Combobox
              options={opcoes.siglas}
              value={concessionaria}
              onChange={handleConcessionariaChange}
              placeholder={isAcl ? "N/A — Mercado Livre" : "Buscar concessionária..."}
              disabled={isAcl}
            />
          </div>

          <div className="space-y-2">
            <Label>Modalidade tarifária</Label>
            <Combobox
              options={opcoes.modalidades}
              value={modalidade}
              onChange={(v) => { setModalidade(v); setSaved(false); }}
              placeholder={isAcl ? "N/A" : "Buscar modalidade..."}
              disabled={!grupo || isAcl}
            />
          </div>
        </div>

        {/* Preview de tarifas */}
        {grupo && !isAcl && concessionaria && subgrupo && (
          <div>
            {loadingTarifas ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando tarifas...
              </div>
            ) : tarifas.length > 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Tarifas vigentes</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                    {tarifas.length} registro{tarifas.length !== 1 && "s"}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tarifas.map((t, i) => (
                    <div key={i} className="rounded-md border border-border bg-white px-3 py-2">
                      <p className="text-xs font-medium text-foreground">{t.posto}</p>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        <span>TUSD: <span className="font-mono text-foreground">{t.tusd.toFixed(6)}</span></span>
                        <span>TE: <span className="font-mono text-foreground">{t.te.toFixed(6)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarifa vigente encontrada para esta combinação.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

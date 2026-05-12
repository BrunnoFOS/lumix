"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  AlertCircle,
  MapPin,
  Zap,
  Calendar,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Settings,
  LinkIcon,
  Loader2,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getOpcoesTarifarias,
  lookupTarifas,
  type TarifaOpcoes,
  type TarifaLookupResult,
} from "@/lib/actions/tarifas-aneel";
import { updateClassificacaoTarifaria, criarOuAtualizarUCTarifaria } from "@/lib/actions/unidades";
import type { UsinaUC } from "@/lib/actions/solis";

const PAGE_SIZE = 10;

const GRUPOS = [
  { value: "grupo_a", label: "Grupo A (Alta tensão)" },
  { value: "grupo_b", label: "Grupo B (Baixa tensão)" },
  { value: "acl", label: "ACL (Mercado Livre)" },
];

const selectClass =
  "flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function parseCity(cidadeUf: string | null): string {
  if (!cidadeUf) return "—";
  const parts = cidadeUf.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : cidadeUf;
}

function inversorState(state: number): { label: string; variant: "default" | "outline" | "destructive" } {
  switch (state) {
    case 1: return { label: "Online", variant: "default" };
    case 2: return { label: "Offline", variant: "outline" };
    case 3: return { label: "Alarme", variant: "destructive" };
    default: return { label: "—", variant: "outline" };
  }
}

interface VinculadaInfo {
  ucId: string;
  empresaNome: string;
  grupo_tarifario?: string | null;
  subgrupo?: string | null;
  concessionaria_sigla?: string | null;
  modalidade_tarifaria_aneel?: string | null;
}

// ——— Dialog de classificação tarifária ———

function TarifaDialog({
  open,
  onClose,
  uc,
  vinc,
  opcoesTarifariasInicial,
}: {
  open: boolean;
  onClose: () => void;
  uc: UsinaUC;
  vinc: VinculadaInfo | undefined;
  opcoesTarifariasInicial: TarifaOpcoes;
}) {
  const router = useRouter();

  const [grupo, setGrupo] = useState(vinc?.grupo_tarifario ?? "");
  const [subgrupo, setSubgrupo] = useState(vinc?.subgrupo ?? "");
  const [concessionaria, setConcessionaria] = useState(vinc?.concessionaria_sigla ?? "");
  const [modalidade, setModalidade] = useState(vinc?.modalidade_tarifaria_aneel ?? "");

  const [opcoes, setOpcoes] = useState(opcoesTarifariasInicial);
  const [tarifas, setTarifas] = useState<TarifaLookupResult[]>([]);
  const [loadingTarifas, setLoadingTarifas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAcl = grupo === "acl";

  // Reset ao abrir com nova UC
  useEffect(() => {
    if (open) {
      setGrupo(vinc?.grupo_tarifario ?? "");
      setSubgrupo(vinc?.subgrupo ?? "");
      setConcessionaria(vinc?.concessionaria_sigla ?? "");
      setModalidade(vinc?.modalidade_tarifaria_aneel ?? "");
      setError(null);
    }
  }, [open, vinc]);

  // Cascata de opções
  useEffect(() => {
    if (!open || isAcl) return;
    async function refresh() {
      const result = await getOpcoesTarifarias({
        grupo: grupo || undefined,
        subgrupo: subgrupo || undefined,
        sigla: concessionaria || undefined,
      });
      setOpcoes(result);
    }
    refresh();
  }, [open, grupo, subgrupo, concessionaria, isAcl]);

  // Lookup de tarifas
  const doLookup = useCallback(async () => {
    if (!concessionaria || !subgrupo || isAcl) { setTarifas([]); return; }
    setLoadingTarifas(true);
    const result = await lookupTarifas(concessionaria, subgrupo, modalidade || null);
    setTarifas(result);
    setLoadingTarifas(false);
  }, [concessionaria, subgrupo, modalidade, isAcl]);

  useEffect(() => { doLookup(); }, [doLookup]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const data = {
      grupo_tarifario: grupo || null,
      subgrupo: subgrupo || null,
      concessionaria_sigla: concessionaria || null,
      modalidade_tarifaria_aneel: modalidade || null,
    };

    let result;
    if (vinc?.ucId) {
      result = await updateClassificacaoTarifaria(vinc.ucId, data);
    } else {
      result = await criarOuAtualizarUCTarifaria(uc.station_id, uc.station_name, data);
    }

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg overflow-visible">
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Classificação tarifária
        </DialogTitle>

        <p className="text-sm text-muted-foreground">
          {uc.station_name}
          {vinc ? (
            <span className="ml-2 text-xs text-green-600">({vinc.empresaNome})</span>
          ) : (
            <span className="ml-2 text-xs text-amber-600">(não vinculada a cliente)</span>
          )}
        </p>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Grupo tarifário</Label>
              <select
                value={grupo}
                onChange={(e) => {
                  setGrupo(e.target.value);
                  setSubgrupo("");
                  setConcessionaria(e.target.value === "acl" ? "ACL" : "");
                  setModalidade("");
                }}
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
                onChange={(v) => { setSubgrupo(v); setModalidade(""); }}
                placeholder={isAcl ? "N/A" : "Buscar subgrupo..."}
                disabled={!grupo || isAcl}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Concessionária</Label>
              <Combobox
                options={opcoes.siglas}
                value={concessionaria}
                onChange={(v) => { setConcessionaria(v); setModalidade(""); }}
                placeholder={isAcl ? "N/A" : "Buscar concessionária..."}
                disabled={isAcl}
              />
            </div>

            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Combobox
                options={opcoes.modalidades}
                value={modalidade}
                onChange={setModalidade}
                placeholder={isAcl ? "N/A" : "Buscar modalidade..."}
                disabled={!grupo || isAcl}
              />
            </div>
          </div>

          {/* Preview tarifas */}
          {grupo && !isAcl && concessionaria && subgrupo && (
            <div>
              {loadingTarifas ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando tarifas...
                </div>
              ) : tarifas.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Tarifas vigentes</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                      {tarifas.length}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tarifas.map((t, i) => (
                      <div key={i} className="rounded-md border border-border bg-white px-3 py-2">
                        <p className="text-xs font-medium">{t.posto}</p>
                        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                          <span>TUSD: <span className="font-mono text-foreground">{t.tusd.toFixed(6)}</span></span>
                          <span>TE: <span className="font-mono text-foreground">{t.te.toFixed(6)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma tarifa vigente encontrada.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !grupo}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ——— Tabela principal ———

export function SolisUCTable({
  ucs,
  error,
  vinculadas = {},
  opcoesTarifarias,
}: {
  ucs: UsinaUC[];
  error?: string;
  vinculadas?: Record<string, VinculadaInfo>;
  opcoesTarifarias: TarifaOpcoes;
}) {
  const [page, setPage] = useState(0);
  const [selectedUC, setSelectedUC] = useState<UsinaUC | null>(null);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (ucs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
        <Radio className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma usina encontrada na Solis.</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(ucs.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const paged = ucs.slice(start, start + PAGE_SIZE);

  const grupoLabels: Record<string, string> = {
    grupo_a: "Grupo A",
    grupo_b: "Grupo B",
    acl: "ACL",
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usina</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Potência (kWp)</TableHead>
              <TableHead>Inversores</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tarifa</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((uc) => {
              const mainInversor = uc.inversores_detalhe?.[0];
              const status = mainInversor
                ? inversorState(mainInversor.state)
                : { label: "—", variant: "outline" as const };
              const vinc = vinculadas[uc.station_id];
              const temTarifa = vinc?.grupo_tarifario;

              return (
                <TableRow key={uc.station_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{uc.station_name}</p>
                        {vinc ? (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <LinkIcon className="h-2.5 w-2.5" />
                            {vinc.empresaNome}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">ID: {uc.station_id}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{parseCity(uc.cidade_uf)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{uc.potencia_instalada_kwp}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{uc.qtd_inversores}x {uc.potencia_inversor_display}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {temTarifa ? (
                      <div className="text-xs">
                        <span className="font-medium">{grupoLabels[vinc.grupo_tarifario!] ?? vinc.grupo_tarifario}</span>
                        {vinc.subgrupo && <span className="text-muted-foreground"> / {vinc.subgrupo}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não configurada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSelectedUC(uc)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {start + 1}–{Math.min(start + PAGE_SIZE, ucs.length)} de {ucs.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedUC && (
        <TarifaDialog
          open={!!selectedUC}
          onClose={() => setSelectedUC(null)}
          uc={selectedUC}
          vinc={vinculadas[selectedUC.station_id]}
          opcoesTarifariasInicial={opcoesTarifarias}
        />
      )}
    </div>
  );
}

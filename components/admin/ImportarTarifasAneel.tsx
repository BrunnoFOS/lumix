"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, Loader2, Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  importarTarifasAneel,
  type TarifaAneelRow,
} from "@/lib/actions/tarifas-aneel";

// Mapeamento flexível de nomes de colunas do arquivo ANEEL
const COLUMN_MAP: Record<string, keyof RawRow> = {
  sigla: "sigla",
  "sigla agente": "sigla",
  concessionaria: "sigla",
  concessionária: "sigla",
  distribuidora: "sigla",
  subgrupo: "subgrupo",
  "sub grupo": "subgrupo",
  modalidade: "modalidade",
  "modalidade tarifária": "modalidade",
  "modalidade tarifaria": "modalidade",
  posto: "posto",
  "posto tarifário": "posto",
  "posto tarifario": "posto",
  tusd: "tusd",
  "tusd r$/kwh": "tusd",
  "tusd r$/mwh": "tusd",
  te: "te",
  "te r$/kwh": "te",
  "te r$/mwh": "te",
  vigência: "vigencia",
  vigencia: "vigencia",
  "vigência início": "vigencia_inicio",
  "vigencia inicio": "vigencia_inicio",
  "início vigência": "vigencia_inicio",
  "inicio vigência": "vigencia_inicio",
  "inicio vigencia": "vigencia_inicio",
  "vigência fim": "vigencia_fim",
  "vigencia fim": "vigencia_fim",
  "fim vigência": "vigencia_fim",
  "fim vigencia": "vigencia_fim",
  "data início": "vigencia_inicio",
  "data inicio": "vigencia_inicio",
  "data fim": "vigencia_fim",
  "base tarifária": "base_tarifaria",
  "base tarifaria": "base_tarifaria",
  unidade: "unidade",
  detalhe: "detalhe",
};

interface RawRow {
  sigla?: string;
  subgrupo?: string;
  modalidade?: string;
  posto?: string;
  detalhe?: string;
  tusd?: number;
  te?: number;
  vigencia?: string;
  vigencia_inicio?: string;
  vigencia_fim?: string;
  base_tarifaria?: string;
  unidade?: string;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // Formato DD/MM/YYYY
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;

  // Formato YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Formato MM/YYYY ou M/YYYY
  const monthYear = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) {
    const month = monthYear[1].padStart(2, "0");
    return `${monthYear[2]}-${month}-01`;
  }

  // Excel serial date number
  const num = Number(value);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }

  return null;
}

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const str = String(value).trim().replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseVigencia(raw: string): { inicio: string; fim: string | null } | null {
  if (!raw) return null;
  const str = raw.trim();

  // "DD/MM/YYYY a DD/MM/YYYY" ou "DD/MM/YYYY - DD/MM/YYYY"
  const rangeMatch = str.match(
    /(\d{2}\/\d{2}\/\d{4})\s*(?:a|-)\s*(\d{2}\/\d{2}\/\d{4})/
  );
  if (rangeMatch) {
    const inicio = parseDate(rangeMatch[1]);
    const fim = parseDate(rangeMatch[2]);
    if (inicio) return { inicio, fim };
  }

  // Data única
  const single = parseDate(str);
  if (single) return { inicio: single, fim: null };

  return null;
}

function parseRows(
  rawData: Record<string, unknown>[]
): { rows: TarifaAneelRow[]; totalBruto: number; filtrados: number } {
  // Mapear headers
  if (!rawData.length) return { rows: [], totalBruto: 0, filtrados: 0 };

  const headers = Object.keys(rawData[0]);
  const mapping: Record<string, keyof RawRow> = {};

  for (const h of headers) {
    const normalized = normalizeHeader(h);
    if (COLUMN_MAP[normalized]) {
      mapping[h] = COLUMN_MAP[normalized];
    }
  }

  const totalBruto = rawData.length;

  // Parse cada linha
  const parsed: RawRow[] = rawData.map((row) => {
    const result: RawRow = {};
    for (const [originalKey, mappedKey] of Object.entries(mapping)) {
      const val = row[originalKey];
      if (mappedKey === "tusd" || mappedKey === "te") {
        (result as Record<string, unknown>)[mappedKey] = parseNumericValue(val);
      } else {
        (result as Record<string, unknown>)[mappedKey] = val != null ? String(val).trim() : undefined;
      }
    }
    return result;
  });

  // Filtrar por "Tarifa de Aplicação" se coluna existe
  const hasBaseTarifaria = parsed.some((r) => r.base_tarifaria);
  let filtered = hasBaseTarifaria
    ? parsed.filter(
        (r) =>
          r.base_tarifaria &&
          normalizeHeader(r.base_tarifaria).includes("tarifa de aplica")
      )
    : parsed;

  // Filtrar apenas R$/MWh se coluna "Unidade" existe (ignorar R$/kW)
  const hasUnidade = filtered.some((r) => r.unidade);
  if (hasUnidade) {
    filtered = filtered.filter(
      (r) => r.unidade && r.unidade.includes("MWh")
    );
  }

  const filtrados = totalBruto - filtered.length;

  // Detectar se os valores estão em MWh (coluna Unidade presente com R$/MWh)
  const isMWh = hasUnidade;

  // Converter para TarifaAneelRow
  const rows: TarifaAneelRow[] = [];

  for (const r of filtered) {
    if (!r.sigla || !r.subgrupo || !r.posto) continue;

    let tusd = r.tusd;
    let te = r.te;

    if (tusd === null || tusd === undefined || te === null || te === undefined) continue;

    // Converter de R$/MWh para R$/kWh
    if (isMWh) {
      tusd = tusd / 1000;
      te = te / 1000;
    }

    // Resolver vigência
    let vigenciaInicio: string | null = null;
    let vigenciaFim: string | null = null;

    if (r.vigencia_inicio) {
      vigenciaInicio = parseDate(r.vigencia_inicio);
      vigenciaFim = r.vigencia_fim ? parseDate(r.vigencia_fim) : null;
    } else if (r.vigencia) {
      const v = parseVigencia(r.vigencia);
      if (v) {
        vigenciaInicio = v.inicio;
        vigenciaFim = v.fim;
      }
    }

    if (!vigenciaInicio) continue;

    rows.push({
      sigla: r.sigla.toUpperCase(),
      subgrupo: r.subgrupo.toUpperCase(),
      modalidade: r.modalidade || null,
      posto: r.posto,
      tusd: Math.round(tusd * 1000000) / 1000000,
      te: Math.round(te * 1000000) / 1000000,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim,
      detalhe: r.detalhe || null,
    });
  }

  return { rows, totalBruto, filtrados };
}

type Step = "idle" | "loading" | "preview" | "importing" | "done" | "error";

export function ImportarTarifasAneel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [rows, setRows] = useState<TarifaAneelRow[]>([]);
  const [stats, setStats] = useState({ totalBruto: 0, filtrados: 0 });
  const [result, setResult] = useState<{ inseridos: number; duplicados: number; descartados: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setStep("loading");
      setDialogOpen(true);
      setError(null);

      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array", cellDates: true });

        // Pegar primeira sheet com dados tabulares (pular sheets com poucas linhas)
        let rawData: Record<string, unknown>[] = [];
        for (const name of wb.SheetNames) {
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            wb.Sheets[name]
          );
          if (data.length > rawData.length) {
            rawData = data;
          }
        }

        if (!rawData.length) {
          setError(
            "Arquivo não contém dados tabulares. Verifique se o arquivo exportado do BI da ANEEL contém as colunas: Sigla, Subgrupo, Modalidade, Posto, TUSD, TE, Vigência."
          );
          setStep("error");
          return;
        }

        const { rows: parsed, totalBruto, filtrados } = parseRows(rawData);

        if (!parsed.length) {
          const headers = Object.keys(rawData[0]).join(", ");
          setError(
            `Nenhum registro válido encontrado após filtragem. Colunas detectadas: ${headers}. Verifique se o arquivo contém as colunas necessárias (Sigla, Subgrupo, Posto, TUSD, TE, Vigência).`
          );
          setStep("error");
          return;
        }

        setRows(parsed);
        setStats({ totalBruto, filtrados });
        setStep("preview");
      } catch (err) {
        console.error("[importar-tarifas] parse error:", err);
        setError("Erro ao processar arquivo. Verifique se é um .xlsx ou .csv válido.");
        setStep("error");
      } finally {
        // Reset file input
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    setStep("importing");
    const res = await importarTarifasAneel(rows);

    if (res.error) {
      setError(res.error);
      setStep("error");
      return;
    }

    setResult({
      inseridos: res.inseridos ?? 0,
      duplicados: res.duplicados ?? 0,
      descartados: res.descartados ?? 0,
    });
    setStep("done");
    router.refresh();
  }, [rows, router]);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    setStep("idle");
    setRows([]);
    setResult(null);
    setError(null);
  }, []);

  const formatCurrency6 = (v: number) =>
    v.toFixed(6).replace(".", ",");

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        Importar Tarifas ANEEL
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[calc(100vw-4rem)] max-h-[85vh] flex flex-col">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Tarifas ANEEL
          </DialogTitle>

          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Processando arquivo...
              </p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="mt-4 max-w-lg text-center text-sm text-red-600">
                {error}
              </p>
              <Button variant="outline" className="mt-4" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          )}

          {/* Preview */}
          {step === "preview" && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {rows.length} registros válidos
                </Badge>
                {stats.filtrados > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {stats.filtrados} filtrados (Base Tarifária)
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {stats.totalBruto} linhas no arquivo original
                </span>
              </div>

              <div className="flex-1 overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-white">Sigla</TableHead>
                      <TableHead className="sticky top-0 bg-white">Subgrupo</TableHead>
                      <TableHead className="sticky top-0 bg-white">Modalidade</TableHead>
                      <TableHead className="sticky top-0 bg-white">Posto</TableHead>
                      <TableHead className="sticky top-0 bg-white text-right">TUSD</TableHead>
                      <TableHead className="sticky top-0 bg-white text-right">TE</TableHead>
                      <TableHead className="sticky top-0 bg-white">Vigência Início</TableHead>
                      <TableHead className="sticky top-0 bg-white">Vigência Fim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.sigla}</TableCell>
                        <TableCell>{row.subgrupo}</TableCell>
                        <TableCell>{row.modalidade || "—"}</TableCell>
                        <TableCell>{row.posto}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency6(row.tusd)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency6(row.te)}
                        </TableCell>
                        <TableCell>{row.vigencia_inicio}</TableCell>
                        <TableCell>{row.vigencia_fim || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 100 && (
                  <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                    Mostrando 100 de {rows.length} registros.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleConfirm}>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar importação ({rows.length} registros)
                </Button>
              </div>
            </>
          )}

          {/* Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Inserindo {rows.length} registros no banco...
              </p>
            </div>
          )}

          {/* Done */}
          {step === "done" && result && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                Importação concluída!
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {result.inseridos} inseridos
                </Badge>
                {result.duplicados > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {result.duplicados} duplicados ignorados
                  </Badge>
                )}
                {result.descartados > 0 && (
                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                    {result.descartados} descartados (APE, SCEE, etc.)
                  </Badge>
                )}
              </div>
              {result.descartados > 0 && (
                <p className="mt-3 max-w-md text-center text-xs text-muted-foreground">
                  Registros com variações de Classe/Detalhe (APE, SCEE) foram descartados.
                  Apenas tarifas padrão do consumidor (Detalhe = &quot;Não se aplica&quot;) foram inseridas.
                </p>
              )}
              <Button variant="outline" className="mt-6" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

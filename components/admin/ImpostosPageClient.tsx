"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { createImposto, deleteImposto } from "@/lib/actions/impostos";

interface Imposto {
  id: string;
  concessionaria_sigla: string;
  uf: string;
  icms_aliquota: number;
  pis_aliquota: number;
  cofins_aliquota: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  fonte_url: string | null;
  observacoes: string | null;
}

function formatPercent(v: number): string {
  return (v * 100).toFixed(2) + "%";
}

function isVigente(imp: Imposto): boolean {
  const hoje = new Date().toISOString().split("T")[0];
  return imp.vigencia_inicio <= hoje && (!imp.vigencia_fim || imp.vigencia_fim >= hoje);
}

export function ImpostosPageClient({ impostos }: { impostos: Imposto[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);

    const result = await createImposto(formData);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const result = await deleteImposto(id);
    setDeleting(null);
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar imposto
        </Button>
      </div>

      {impostos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Percent className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Nenhum imposto cadastrado
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre as alíquotas de ICMS, PIS e COFINS por concessionária.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concessionária</TableHead>
                <TableHead>UF</TableHead>
                <TableHead className="text-right">ICMS</TableHead>
                <TableHead className="text-right">PIS</TableHead>
                <TableHead className="text-right">COFINS</TableHead>
                <TableHead className="text-right">Fator</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {impostos.map((imp) => {
                const fator = 1 / (1 - Number(imp.icms_aliquota) - Number(imp.pis_aliquota) - Number(imp.cofins_aliquota));
                const vigente = isVigente(imp);
                return (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium">{imp.concessionaria_sigla}</TableCell>
                    <TableCell>{imp.uf}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(Number(imp.icms_aliquota))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(Number(imp.pis_aliquota))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(Number(imp.cofins_aliquota))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {fator.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {imp.vigencia_inicio}
                      {imp.vigencia_fim ? ` → ${imp.vigencia_fim}` : " → atual"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vigente ? "default" : "outline"}>
                        {vigente ? "Vigente" : "Expirado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        disabled={deleting === imp.id}
                        onClick={() => handleDelete(imp.id)}
                      >
                        {deleting === imp.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de cadastro */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar imposto</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="concessionaria_sigla">Concessionária</Label>
                <Input
                  id="concessionaria_sigla"
                  name="concessionaria_sigla"
                  placeholder="Ex: COSERN"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  name="uf"
                  placeholder="Ex: RN"
                  maxLength={2}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="icms_aliquota">ICMS (decimal)</Label>
                <Input
                  id="icms_aliquota"
                  name="icms_aliquota"
                  type="number"
                  step="0.00001"
                  min="0"
                  max="1"
                  placeholder="0.18000"
                  required
                />
                <p className="text-xs text-muted-foreground">Ex: 0.18 = 18%</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pis_aliquota">PIS (decimal)</Label>
                <Input
                  id="pis_aliquota"
                  name="pis_aliquota"
                  type="number"
                  step="0.00001"
                  min="0"
                  max="1"
                  placeholder="0.01650"
                  required
                />
                <p className="text-xs text-muted-foreground">Ex: 0.0165 = 1,65%</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cofins_aliquota">COFINS (decimal)</Label>
                <Input
                  id="cofins_aliquota"
                  name="cofins_aliquota"
                  type="number"
                  step="0.00001"
                  min="0"
                  max="1"
                  placeholder="0.07600"
                  required
                />
                <p className="text-xs text-muted-foreground">Ex: 0.076 = 7,6%</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vigencia_inicio">Início vigência</Label>
                <Input
                  id="vigencia_inicio"
                  name="vigencia_inicio"
                  type="date"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vigencia_fim">Fim vigência</Label>
                <Input
                  id="vigencia_fim"
                  name="vigencia_fim"
                  type="date"
                />
                <p className="text-xs text-muted-foreground">Vazio = vigente</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fonte_url">Fonte (URL)</Label>
              <Input
                id="fonte_url"
                name="fonte_url"
                type="url"
                placeholder="https://concessionaria.com.br/tarifas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                name="observacoes"
                rows={2}
                placeholder="Notas sobre a fonte ou período"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

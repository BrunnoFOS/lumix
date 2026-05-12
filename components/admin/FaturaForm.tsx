"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/shared/FileUpload";
import { createFatura } from "@/lib/actions/faturas";

interface UC {
  id: string;
  codigo_uc: string;
  empresa: { id: string; nome: string } | null;
  source?: "database" | "solis";
  station_name?: string;
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

export function FaturaForm({ ucs, clientes = [] }: { ucs: UC[]; clientes?: Cliente[] }) {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState | null, formData: FormData): Promise<FormState> => {
      const mesInput = formData.get("mes_referencia") as string;
      if (mesInput && !mesInput.endsWith("-01")) {
        formData.set("mes_referencia", `${mesInput}-01`);
      }
      if (pdfUrl) formData.set("pdf_url", pdfUrl);
      if (imagemUrl) formData.set("imagem_url", imagemUrl);
      return await createFatura(formData);
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
                  onChange={(e) => setClienteId(e.target.value)}
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
              <select name="uc_id" className={selectClass} required>
                <option value="">Selecione a UC</option>
                {ucsFiltradas.map((uc) => (
                  <option key={uc.id} value={uc.id}>
                    {uc.source === "solis" ? `⚡ ${uc.station_name}` : `${uc.codigo_uc} — ${uc.empresa?.nome ?? ""}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mes_referencia">Mês da fatura *</Label>
              <Input id="mes_referencia" name="mes_referencia" type="month" required />
            </div>
          </CardContent>
        </Card>

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

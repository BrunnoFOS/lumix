"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Upload, X, FileText, FileImage, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { criarRelatorioComAnexo } from "@/lib/actions/relatorios";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

interface UC {
  id: string;
  codigo_uc: string;
  empresa: { id: string; nome: string } | null;
  source?: "database" | "solis";
  station_name?: string;
}

export function GerarRelatorioForm({
  ucs,
  onSuccess,
  onCancel,
}: {
  ucs: UC[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ucId, setUcId] = useState("");
  const [comentario, setComentario] = useState("");

  const ucOptions = useMemo(
    () =>
      ucs.map((uc) => ({
        value: uc.id,
        label:
          uc.source === "solis"
            ? `${uc.station_name}`
            : `${uc.codigo_uc} — ${uc.empresa?.nome ?? ""}`,
      })),
    [ucs]
  );

  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Tipo de arquivo não aceito. Use JPG, PNG ou PDF.";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande. Máximo: 10MB.";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setFile(f);

      if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview(null);
      }
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const ucId = formData.get("uc_id") as string;
    const inicioCiclo = formData.get("inicio_ciclo") as string;
    const fimCiclo = formData.get("fim_ciclo") as string;

    if (!ucId || !inicioCiclo || !fimCiclo) {
      setError("Selecione a UC e preencha início e fim do ciclo.");
      return;
    }

    if (fimCiclo <= inicioCiclo) {
      setError("O fim do ciclo deve ser posterior ao início.");
      return;
    }

    if (!file) {
      setError("Anexe a fatura antes de continuar.");
      return;
    }

    // Derivar mes_referencia do fim_ciclo (primeiro dia do mês do fim)
    const fimDate = new Date(fimCiclo + "T00:00:00");
    const mesReferencia = `${fimDate.getFullYear()}-${String(fimDate.getMonth() + 1).padStart(2, "0")}-01`;
    const mesLabel = `${fimDate.getFullYear()}-${String(fimDate.getMonth() + 1).padStart(2, "0")}`;

    setSubmitting(true);

    try {
      // Encontrar empresa_id da UC selecionada
      const selectedUc = ucs.find((u) => u.id === ucId);
      const empresaId = selectedUc?.empresa?.id;
      if (!empresaId) {
        setError("UC sem empresa vinculada.");
        setSubmitting(false);
        return;
      }

      // Upload para Supabase Storage
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `relatorios/${empresaId}/${ucId}/${mesLabel}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("faturas")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        setError("Erro ao fazer upload do arquivo. Tente novamente.");
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("faturas")
        .getPublicUrl(fileName);

      // Criar relatório com URL do anexo
      const submitData = new FormData();
      submitData.set("uc_id", ucId);
      submitData.set("empresa_id", empresaId);
      submitData.set("mes_referencia", mesReferencia);
      submitData.set("inicio_ciclo", inicioCiclo);
      submitData.set("fim_ciclo", fimCiclo);
      submitData.set("pdf_url", urlData.publicUrl);
      submitData.set("comentario_admin", comentario || "");

      const result = await criarRelatorioComAnexo(submitData);

      if (result.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do relatório</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="uc_id">Unidade consumidora *</Label>
              <Combobox
                name="uc_id"
                options={ucOptions}
                value={ucId}
                onChange={setUcId}
                placeholder="Buscar UC ou usina..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inicio_ciclo">Início do ciclo *</Label>
              <Input id="inicio_ciclo" name="inicio_ciclo" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fim_ciclo">Fim do ciclo *</Label>
              <Input id="fim_ciclo" name="fim_ciclo" type="date" required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anexo da fatura *</CardTitle>
          </CardHeader>
          <CardContent>
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? "border-primary bg-orange-50"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Arraste a fatura aqui ou clique para selecionar
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG ou PDF — máx. 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {preview && (
                  <div className="relative mx-auto max-w-md overflow-hidden rounded-lg border border-border">
                    <img
                      src={preview}
                      alt="Preview da fatura"
                      className="w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    {file.type === "application/pdf" ? (
                      <FileText className="h-5 w-5 text-red-500" />
                    ) : (
                      <FileImage className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemove}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Label htmlFor="comentario_admin">
              Comentário para o relatório (opcional)
            </Label>
            <Textarea
              id="comentario_admin"
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 600))}
              placeholder="Ex: Geração impactada por dias nublados no início do mês..."
              rows={3}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {600 - comentario.length} caracteres restantes
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Anexar fatura
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}

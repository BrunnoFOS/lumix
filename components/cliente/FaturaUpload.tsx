"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { createFaturaCliente } from "@/lib/actions/faturas";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

interface UC {
  id: string;
  codigo_uc: string;
}

export function FaturaUpload({ ucs, empresaId }: { ucs: UC[]; empresaId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Tipo de arquivo não aceito. Use JPG, PNG ou PDF.";
    }
    if (f.size > MAX_FILE_SIZE) {
      return "Arquivo muito grande. Máximo: 10MB.";
    }
    return null;
  }, []);

  const handleFile = useCallback((f: File) => {
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
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

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
    const mesInput = formData.get("mes_input") as string;

    if (!ucId || !mesInput) {
      setError("Selecione a UC e o mês de referência.");
      return;
    }

    setUploading(true);

    try {
      let fileUrl: string | null = null;
      let isPdf = false;

      // Upload para Supabase Storage
      if (file) {
        isPdf = file.type === "application/pdf";
        const supabase = createClient();
        const ext = file.name.split(".").pop();
        const fileName = `${empresaId}/${ucId}/${mesInput}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("faturas")
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          setError("Erro ao fazer upload do arquivo. Tente novamente.");
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("faturas")
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
      }

      const submitData = new FormData();
      submitData.set("uc_id", ucId);
      submitData.set("mes_referencia", `${mesInput}-01`);
      if (fileUrl && isPdf) submitData.set("pdf_url", fileUrl);
      if (fileUrl && !isPdf) submitData.set("imagem_url", fileUrl);

      const result = await createFaturaCliente(submitData);

      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.refresh(), 1000);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-emerald-50 p-3">
            <Upload className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            Fatura enviada com sucesso!
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A equipe Lumix irá processar sua fatura em breve.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setSuccess(false);
              handleRemove();
            }}
          >
            Enviar outra fatura
          </Button>
        </CardContent>
      </Card>
    );
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
            <CardTitle className="text-lg">Dados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="uc_id">Unidade consumidora *</Label>
              <select
                name="uc_id"
                className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
              >
                <option value="">Selecione a UC</option>
                {ucs.map((uc) => (
                  <option key={uc.id} value={uc.id}>
                    UC {uc.codigo_uc}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mes_input">Mês de referência *</Label>
              <Input id="mes_input" name="mes_input" type="month" required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Imagem da fatura</CardTitle>
          </CardHeader>
          <CardContent>
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? "border-primary bg-orange-50"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Arraste a imagem aqui ou clique para selecionar
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
                    <FileImage className="h-5 w-5 text-muted-foreground" />
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

        <Button type="submit" disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Enviar fatura
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

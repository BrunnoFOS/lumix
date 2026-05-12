"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

interface FileUploadProps {
  bucket: string;
  path: string;
  onUpload: (url: string, isPdf: boolean) => void;
  label?: string;
}

export function FileUpload({ bucket, path, onUpload, label = "Arquivo da fatura" }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (err) { setError(err); return; }
    setError(null);
    setFile(f);
    setUploaded(false);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, [validateFile]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    setUploaded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `${path}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        setError("Erro ao fazer upload. Tente novamente.");
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const isPdf = file.type === "application/pdf";
      onUpload(urlData.publicUrl, isPdf);
      setUploaded(true);
    } catch {
      setError("Erro inesperado no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>

      {error && (
        <div className="rounded-md bg-red-50 p-2 text-xs text-red-600">{error}</div>
      )}

      {!file ? (
        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver ? "border-primary bg-orange-50" : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium text-foreground">
            Arraste o arquivo aqui ou clique para selecionar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou PDF — máx. 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {preview && (
            <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-border">
              <img src={preview} alt="Preview" className="w-full object-contain" />
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
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {uploaded ? (
                <span className="text-xs font-medium text-emerald-600">Enviado</span>
              ) : (
                <Button size="sm" onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Enviando..." : "Enviar"}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleRemove} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

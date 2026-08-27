"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { rejeitarFaturaCliente } from "@/lib/actions/faturas";

interface Props {
  faturaId: string;
  ucCodigo: string;
  mesReferencia: string;
}

export function FaturaRejectButton({ faturaId, ucCodigo, mesReferencia }: Props) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  async function handleReject() {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }

    setRejecting(true);

    const result = await rejeitarFaturaCliente(faturaId, motivo);

    setRejecting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Fatura rejeitada.");
      setOpen(false);
      setMotivo("");
      router.refresh();
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setMotivo(""); }}>
      <AlertDialogTrigger>
        <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10">
          <XCircle className="mr-2 h-4 w-4" />
          Rejeitar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeitar fatura</AlertDialogTitle>
          <AlertDialogDescription>
            A fatura da UC <strong>{ucCodigo}</strong> referente a <strong>{mesReferencia}</strong> será marcada como rejeitada. O cliente poderá ver o motivo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="motivo-rejeicao">Motivo da rejeição *</Label>
          <Textarea
            id="motivo-rejeicao"
            placeholder="Ex: Imagem ilegível, fatura do mês errado..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={rejecting}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleReject}
            disabled={rejecting || !motivo.trim()}
            variant="destructive"
          >
            {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rejeitar fatura
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

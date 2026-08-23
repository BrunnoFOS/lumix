"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteFatura } from "@/lib/actions/faturas";

interface Props {
  faturaId: string;
  ucCodigo: string;
  mesReferencia: string;
}

export function FaturaDeleteButton({ faturaId, ucCodigo, mesReferencia }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setDeleting(true);

    const result = await deleteFatura(faturaId);

    setDeleting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Fatura excluída com sucesso.");
      setOpen(false);
      router.push("/admin/faturas");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir fatura
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fatura</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a fatura da UC <strong>{ucCodigo}</strong> referente ao mês <strong>{mesReferencia}</strong>?
            <br />
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

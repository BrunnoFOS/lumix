"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerarRelatorioPDF } from "@/lib/actions/faturas-processadas";

interface Props {
  fpId: string;
  status: string;
}

const REGENERABLE_STATUSES = ["extraido", "gerado", "erro"];

export function RegenerarRelatorioButton({ fpId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!REGENERABLE_STATUSES.includes(status)) return null;

  async function handleClick() {
    setLoading(true);
    const result = await regenerarRelatorioPDF(fpId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Relatório sendo regenerado. Atualize a página em instantes.");
      router.refresh();
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
      )}
      Regerar relatório
    </Button>
  );
}

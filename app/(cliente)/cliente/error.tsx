"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClienteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Cliente error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-red-50 p-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">
        Algo deu errado
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ocorreu um erro ao carregar esta página. Tente novamente ou entre em
        contato com a equipe Lumix se o problema persistir.
      </p>
      <Button onClick={reset} className="mt-6">
        Tentar novamente
      </Button>
    </div>
  );
}

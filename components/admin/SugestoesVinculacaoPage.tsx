"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, X, Loader2, Link2, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  confirmarSugestao,
  rejeitarSugestao,
  detectarSugestoes,
  type SugestaoVinculacao,
} from "@/lib/actions/sugestoes-vinculacao";

export function SugestoesPageClient({
  sugestoes: initial,
}: {
  sugestoes: SugestaoVinculacao[];
}) {
  const router = useRouter();
  const [sugestoes, setSugestoes] = useState(initial);
  const [processando, setProcessando] = useState<string | null>(null);
  const [detectando, setDetectando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleConfirmar(id: string) {
    setProcessando(id);
    setFeedback(null);
    const result = await confirmarSugestao(id);
    if (result.error) {
      setFeedback(result.error);
    } else {
      setSugestoes((prev) => prev.filter((s) => s.id !== id));
      setFeedback("Vinculação confirmada com sucesso.");
    }
    setProcessando(null);
    router.refresh();
  }

  async function handleRejeitar(id: string) {
    setProcessando(id);
    setFeedback(null);
    const result = await rejeitarSugestao(id);
    if (result.error) {
      setFeedback(result.error);
    } else {
      setSugestoes((prev) => prev.filter((s) => s.id !== id));
    }
    setProcessando(null);
    router.refresh();
  }

  async function handleDetectar() {
    setDetectando(true);
    setFeedback(null);
    const result = await detectarSugestoes();
    if (result.error) {
      setFeedback(result.error);
    } else if (result.count === 0) {
      setFeedback("Nenhuma nova sugestão encontrada.");
    } else {
      setFeedback(`${result.count} nova${result.count !== 1 ? "s" : ""} sugestão${result.count !== 1 ? "ões" : ""} detectada${result.count !== 1 ? "s" : ""}.`);
      router.refresh();
    }
    setDetectando(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sugestoes.length > 0
            ? `${sugestoes.length} sugestão${sugestoes.length !== 1 ? "ões" : ""} pendente${sugestoes.length !== 1 ? "s" : ""}`
            : "Nenhuma sugestão pendente"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDetectar}
          disabled={detectando}
        >
          {detectando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Detectar novas
        </Button>
      </div>

      {feedback && (
        <div className="rounded-md bg-muted p-3 text-sm text-foreground">
          {feedback}
        </div>
      )}

      {sugestoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <Inbox className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Todas as sugestões foram processadas.
          </p>
          <p className="text-xs text-muted-foreground">
            Clique em &quot;Detectar novas&quot; para verificar se há matches pendentes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sugestoes.map((s) => {
            const isProcessing = processando === s.id;
            return (
              <Card key={s.id} className="transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.station_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {s.provider === "solis" ? "Solis" : "SunGrow"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          s.score >= 0.6
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }
                      >
                        {Math.round(s.score * 100)}% similar
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Match com UC: <strong className="text-foreground">{s.uc_codigo}</strong>
                      {s.empresa_nome && (
                        <span className="ml-1 text-xs">({s.empresa_nome})</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleRejeitar(s.id)}
                      disabled={isProcessing}
                      title="Rejeitar — não é a mesma usina"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleConfirmar(s.id)}
                      disabled={isProcessing}
                      title="Confirmar — vincular esta station à UC"
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="mr-2 h-4 w-4" />
                      )}
                      Confirmar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

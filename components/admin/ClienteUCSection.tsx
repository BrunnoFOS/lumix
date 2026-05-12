"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Plus, X, Unlink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VincularSolisUC } from "@/components/admin/VincularSolisUC";
import { desvincularUC } from "@/lib/actions/unidades";
import type { UsinaUC } from "@/lib/actions/solis";

interface UC {
  id: string;
  codigo_uc: string;
  distribuidora: string;
  potencia_instalada_kwp: number;
  ativa: boolean;
  station_id: string | null;
}

interface UsinaComProvider extends UsinaUC {
  provider: "solis" | "sungrow";
}

export function ClienteUCSection({
  unidades,
  usinasDisponiveis,
  empresaId,
}: {
  unidades: UC[];
  usinasDisponiveis: UsinaComProvider[];
  empresaId: string;
}) {
  const router = useRouter();
  const [showVincular, setShowVincular] = useState(false);
  const [desvinculando, setDesvinculando] = useState<string | null>(null);

  async function handleDesvincular(ucId: string) {
    setDesvinculando(ucId);
    await desvincularUC(ucId);
    setDesvinculando(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Unidades consumidoras ({unidades.length})
        </CardTitle>
        {showVincular ? (
          <Button size="sm" variant="outline" onClick={() => setShowVincular(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        ) : (
          <Button size="sm" onClick={() => setShowVincular(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar UC
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {showVincular && (
          <div className="rounded-lg border border-primary/20 bg-orange-50/50 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">
              Selecione uma usina para vincular como UC deste cliente:
            </p>
            <VincularSolisUC usinas={usinasDisponiveis} empresaId={empresaId} />
          </div>
        )}

        {unidades.length === 0 && !showVincular ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma UC vinculada a este cliente.
          </p>
        ) : unidades.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código UC</TableHead>
                <TableHead>Distribuidora</TableHead>
                <TableHead>Potência (kWp)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((uc) => (
                <TableRow key={uc.id}>
                  <TableCell>
                    <Link
                      href={`/admin/unidades/${uc.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {uc.codigo_uc}
                    </Link>
                  </TableCell>
                  <TableCell>{uc.distribuidora || "—"}</TableCell>
                  <TableCell>{uc.potencia_instalada_kwp}</TableCell>
                  <TableCell>
                    <Badge variant={uc.ativa ? "default" : "outline"}>
                      {uc.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDesvincular(uc.id)}
                      disabled={desvinculando === uc.id}
                      title="Desvincular UC"
                    >
                      {desvinculando === uc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

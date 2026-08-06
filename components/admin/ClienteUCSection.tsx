"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Plus, X, Unlink, Loader2, AlertTriangle, Wifi, WifiOff } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VincularSolisUC } from "@/components/admin/VincularSolisUC";
import { desvincularUC, desvincularStation } from "@/lib/actions/unidades";
import type { UsinaUC } from "@/lib/actions/solis";

interface UC {
  id: string;
  codigo_uc: string;
  distribuidora: string;
  potencia_instalada_kwp: number;
  ativa: boolean;
  arquivada: boolean;
  station_id: string | null;
  is_station_adicional?: boolean;
  station_id_adicional?: string;
  uc_principal_nome?: string;
  usina_status?: "online" | "offline" | "alerta" | null;
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
  const [ucParaDesvincular, setUcParaDesvincular] = useState<UC | null>(null);

  async function handleConfirmarDesvincular() {
    if (!ucParaDesvincular) return;
    const key = ucParaDesvincular.is_station_adicional
      ? `${ucParaDesvincular.id}-${ucParaDesvincular.station_id_adicional}`
      : ucParaDesvincular.id;
    setDesvinculando(key);
    setUcParaDesvincular(null);

    if (ucParaDesvincular.is_station_adicional && ucParaDesvincular.station_id_adicional) {
      await desvincularStation(ucParaDesvincular.id, ucParaDesvincular.station_id_adicional);
    } else {
      await desvincularUC(ucParaDesvincular.id);
    }

    setDesvinculando(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Unidades consumidoras ({unidades.filter((u) => !u.is_station_adicional).length})
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
            <VincularSolisUC
              usinas={usinasDisponiveis}
              empresaId={empresaId}
              ucsExistentes={unidades.map((uc) => ({ id: uc.id, codigo_uc: uc.codigo_uc }))}
            />
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
                <TableHead>Usina</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((uc) => {
                const rowKey = uc.is_station_adicional
                  ? `${uc.id}-${uc.station_id_adicional}`
                  : uc.id;
                return (
                  <TableRow key={rowKey} className={uc.arquivada ? "opacity-50" : ""}>
                    <TableCell>
                      <Link
                        href={`/admin/unidades/${uc.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {uc.codigo_uc}
                      </Link>
                      {uc.is_station_adicional && uc.uc_principal_nome && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Vinculada a: {uc.uc_principal_nome}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{uc.distribuidora || "—"}</TableCell>
                    <TableCell>{uc.potencia_instalada_kwp}</TableCell>
                    <TableCell>
                      {uc.usina_status === "online" ? (
                        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                          <Wifi className="h-3 w-3" />
                          Online
                        </Badge>
                      ) : uc.usina_status === "offline" ? (
                        <Badge variant="destructive" className="gap-1">
                          <WifiOff className="h-3 w-3" />
                          Offline
                        </Badge>
                      ) : uc.usina_status === "alerta" ? (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Alerta
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {uc.arquivada ? (
                        <Badge variant="secondary">Arquivada</Badge>
                      ) : (
                        <Badge variant={uc.ativa ? "default" : "outline"}>
                          {uc.ativa ? "Ativa" : "Inativa"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!uc.arquivada && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setUcParaDesvincular(uc)}
                          disabled={desvinculando === rowKey}
                          title={uc.is_station_adicional ? "Desvincular station adicional" : "Desvincular UC deste cliente"}
                        >
                          {desvinculando === rowKey ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unlink className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>

      <AlertDialog
        open={!!ucParaDesvincular}
        onOpenChange={(open) => { if (!open) setUcParaDesvincular(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Desvincular UC
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Tem certeza que deseja desvincular{" "}
                {ucParaDesvincular?.is_station_adicional ? "a station adicional" : "a UC"}{" "}
                <strong className="text-foreground">{ucParaDesvincular?.codigo_uc}</strong>
                {ucParaDesvincular?.is_station_adicional ? "?" : " deste cliente?"}
              </span>
              <span className="block text-xs">
                {ucParaDesvincular?.is_station_adicional
                  ? "Apenas o vínculo desta station será removido. A UC principal não será afetada."
                  : "A UC será arquivada e os vínculos com usinas de monitoramento serão removidos. Você poderá restaurá-la depois na página de unidades."}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarDesvincular}
              className="bg-red-600 hover:bg-red-700"
            >
              <Unlink className="mr-2 h-4 w-4" />
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

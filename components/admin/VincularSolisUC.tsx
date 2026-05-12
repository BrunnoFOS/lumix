"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Radio, Link2, Loader2, CheckCircle, MapPin, Cpu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProviderFilterTabs, type ProviderFilter } from "@/components/shared/ProviderFilter";
import { vincularSolisUC } from "@/lib/actions/unidades";
import type { UsinaUC } from "@/lib/actions/solis";

interface UsinaComProvider extends UsinaUC {
  provider: "solis" | "sungrow";
}

function parseCity(cidadeUf: string | null): string {
  if (!cidadeUf) return "—";
  const parts = cidadeUf.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : cidadeUf;
}

export function VincularSolisUC({
  usinas,
  empresaId,
}: {
  usinas: UsinaComProvider[];
  empresaId: string;
}) {
  const router = useRouter();
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [vinculados, setVinculados] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<ProviderFilter>("todos");

  const filtradas = useMemo(() => {
    let list = usinas;
    if (provider !== "todos") {
      list = list.filter((u) => u.provider === provider);
    }
    if (search) {
      const term = search.toLowerCase();
      list = list.filter((u) => u.station_name.toLowerCase().includes(term));
    }
    return list;
  }, [usinas, provider, search]);

  async function handleVincular(uc: UsinaComProvider) {
    setVinculando(uc.station_id);
    setError(null);

    const result = await vincularSolisUC(empresaId, {
      station_id: uc.station_id,
      station_name: uc.station_name,
      potencia_instalada_kwp: uc.potencia_instalada_kwp,
      qtd_inversores: uc.qtd_inversores,
      modelo_inversores: uc.modelo_inversores,
      potencia_inversor_kw: uc.potencia_inversor_kw,
      data_instalacao_iso: uc.data_instalacao_iso,
      cidade_uf: uc.cidade_uf,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setVinculados((prev) => new Set(prev).add(uc.station_id));
      router.refresh();
    }
    setVinculando(null);
  }

  if (usinas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-6">
        <Radio className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma usina disponível para vincular.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da usina..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ProviderFilterTabs value={provider} onChange={setProvider} />
        <span className="text-xs text-muted-foreground">
          {filtradas.length} usina{filtradas.length !== 1 && "s"}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nenhuma usina encontrada com os filtros aplicados.
        </p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usina</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Potência</TableHead>
                <TableHead>Inversores</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((uc) => {
                const jaVinculado = vinculados.has(uc.station_id);

                return (
                  <TableRow key={uc.station_id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{uc.station_name}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {uc.provider === "solis" ? "Solis" : "SunGrow"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {parseCity(uc.cidade_uf)}
                      </div>
                    </TableCell>
                    <TableCell>{uc.potencia_instalada_kwp} kWp</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                        {uc.qtd_inversores}x {uc.potencia_inversor_kw} kW
                      </div>
                    </TableCell>
                    <TableCell>
                      {jaVinculado ? (
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Vinculada
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVincular(uc)}
                          disabled={vinculando === uc.station_id}
                        >
                          {vinculando === uc.station_id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Link2 className="mr-1 h-3.5 w-3.5" />
                          )}
                          Vincular
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

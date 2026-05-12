"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function TarifaSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apenasVigentes = searchParams.get("vigencia") !== "todas";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/tarifas?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por concessionária (sigla)..."
          className="pl-9"
          defaultValue={searchParams.get("sigla") ?? ""}
          onChange={(e) => {
            const timeout = setTimeout(
              () => updateParam("sigla", e.target.value),
              300
            );
            return () => clearTimeout(timeout);
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="vigencia-filter"
          checked={apenasVigentes}
          onCheckedChange={(checked) =>
            updateParam("vigencia", checked ? "" : "todas")
          }
        />
        <Label htmlFor="vigencia-filter" className="text-sm cursor-pointer">
          Apenas vigentes
        </Label>
      </div>
    </div>
  );
}

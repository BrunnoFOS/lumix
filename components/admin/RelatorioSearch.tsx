"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RelatorioSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/relatorios?${params.toString()}`);
  }

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, UC ou título..."
          className="pl-9"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => {
            const timeout = setTimeout(
              () => updateParam("search", e.target.value),
              300
            );
            return () => clearTimeout(timeout);
          }}
        />
      </div>
      <Select
        defaultValue={searchParams.get("status") ?? "todos"}
        onValueChange={(value) =>
          updateParam("status", value === "todos" ? "" : value ?? "")
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos status</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="enviado">Enviado</SelectItem>
          <SelectItem value="erro">Erro</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

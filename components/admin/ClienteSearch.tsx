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

export function ClienteSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/clientes?${params.toString()}`);
  }

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          className="pl-9"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => {
            const timeout = setTimeout(() => updateParam("search", e.target.value), 300);
            return () => clearTimeout(timeout);
          }}
        />
      </div>
      <Select
        defaultValue={searchParams.get("status") ?? "todas"}
        onValueChange={(value) => updateParam("status", value === "todas" ? "" : value ?? "")}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          <SelectItem value="ativas">Ativas</SelectItem>
          <SelectItem value="inativas">Inativas</SelectItem>
          <SelectItem value="arquivadas">Arquivadas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

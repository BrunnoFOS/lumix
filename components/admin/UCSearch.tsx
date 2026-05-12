"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UCSearchProps {
  empresas: { id: string; nome: string }[];
}

export function UCSearch({ empresas }: UCSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const empresaId = searchParams.get("empresa") ?? "";
  const empresaNome = empresas.find((e) => e.id === empresaId)?.nome ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/unidades?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome da usina..."
          className="pl-9"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => {
            const timeout = setTimeout(() => updateParam("search", e.target.value), 300);
            return () => clearTimeout(timeout);
          }}
        />
      </div>
      <div className="w-56">
        <Combobox
          options={empresas.map((e) => e.nome)}
          value={empresaNome}
          onChange={(nome) => {
            const found = empresas.find((e) => e.nome === nome);
            updateParam("empresa", found?.id ?? "");
          }}
          placeholder="Todas as empresas"
        />
      </div>
      <Select
        value={searchParams.get("provider") ?? "todos"}
        onValueChange={(v) => updateParam("provider", v === "todos" ? "" : v ?? "")}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="solis">Solis</SelectItem>
          <SelectItem value="sungrow">SunGrow</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("vinculacao") ?? "todas"}
        onValueChange={(v) => updateParam("vinculacao", v === "todas" ? "" : v ?? "")}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          <SelectItem value="vinculadas">Vinculadas</SelectItem>
          <SelectItem value="nao_vinculadas">Não vinculadas</SelectItem>
          <SelectItem value="com_tarifa">Com tarifa</SelectItem>
          <SelectItem value="sem_tarifa">Sem tarifa</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

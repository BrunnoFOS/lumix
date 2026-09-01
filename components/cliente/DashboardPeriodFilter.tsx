"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function DashboardPeriodFilter({ defaultMes }: { defaultMes?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function defaultDates(mes?: string) {
    if (!mes) return { inicio: "", fim: "" };
    const [y, m] = mes.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    return {
      inicio: `${y}-${mm}-01`,
      fim: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  const paramInicio = searchParams.get("inicio") || "";
  const paramFim = searchParams.get("fim") || "";
  const defaults = defaultDates(defaultMes);

  const [inicio, setInicio] = useState(paramInicio || defaults.inicio);
  const [fim, setFim] = useState(paramFim || defaults.fim);

  function handleSubmit() {
    if (!inicio || !fim) return;
    const params = new URLSearchParams();
    params.set("inicio", inicio);
    params.set("fim", fim);
    router.push(`/cliente/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Período:
      </Label>
      <Input
        type="date"
        className="w-40"
        value={inicio}
        onChange={(e) => setInicio(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />
      <span className="text-sm text-muted-foreground">a</span>
      <Input
        type="date"
        className="w-40"
        value={fim}
        onChange={(e) => setFim(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!inicio || !fim}
      >
        <Search className="mr-1 h-4 w-4" />
        Filtrar
      </Button>
    </div>
  );
}

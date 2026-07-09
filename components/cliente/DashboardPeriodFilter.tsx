"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DashboardPeriodFilter({ defaultMes }: { defaultMes?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derivar datas padrão a partir do mês
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

  function handleChange(field: "inicio" | "fim", value: string) {
    const newInicio = field === "inicio" ? value : inicio;
    const newFim = field === "fim" ? value : fim;

    if (field === "inicio") setInicio(value);
    if (field === "fim") setFim(value);

    const params = new URLSearchParams(searchParams.toString());
    if (newInicio) {
      params.set("inicio", newInicio);
    } else {
      params.delete("inicio");
    }
    if (newFim) {
      params.set("fim", newFim);
      // Derivar mes do fim para compatibilidade
      params.set("mes", `${newFim.substring(0, 7)}-01`);
    } else {
      params.delete("fim");
      params.delete("mes");
    }
    router.push(`/cliente/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Período:
      </Label>
      <Input
        type="date"
        className="w-40"
        value={inicio}
        onChange={(e) => handleChange("inicio", e.target.value)}
      />
      <span className="text-sm text-muted-foreground">a</span>
      <Input
        type="date"
        className="w-40"
        value={fim}
        onChange={(e) => handleChange("fim", e.target.value)}
      />
    </div>
  );
}

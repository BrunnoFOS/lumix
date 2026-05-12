"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DashboardPeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      // Converter YYYY-MM para YYYY-MM-01
      params.set("mes", `${value}-01`);
    } else {
      params.delete("mes");
    }
    router.push(`/cliente/dashboard?${params.toString()}`);
  }

  const currentMes = searchParams.get("mes");
  const defaultValue = currentMes ? currentMes.substring(0, 7) : "";

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="periodo" className="text-sm text-muted-foreground whitespace-nowrap">
        Período:
      </Label>
      <Input
        id="periodo"
        type="month"
        className="w-44"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}

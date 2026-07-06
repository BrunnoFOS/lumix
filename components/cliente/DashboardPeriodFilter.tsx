"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DashboardPeriodFilter({ defaultMes }: { defaultMes?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMes = searchParams.get("mes") || defaultMes;
  const [value, setValue] = useState(currentMes ? currentMes.substring(0, 7) : "");

  function handleChange(newValue: string) {
    setValue(newValue);
    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      // Converter YYYY-MM para YYYY-MM-01
      params.set("mes", `${newValue}-01`);
    } else {
      params.delete("mes");
    }
    router.push(`/cliente/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="periodo" className="text-sm text-muted-foreground whitespace-nowrap">
        Período:
      </Label>
      <Input
        id="periodo"
        type="month"
        className="w-44"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}

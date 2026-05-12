"use client";

import { cn } from "@/lib/utils";

export type ProviderFilter = "todos" | "solis" | "sungrow";

interface Props {
  value: ProviderFilter;
  onChange: (v: ProviderFilter) => void;
}

const options: { value: ProviderFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "solis", label: "Solis" },
  { value: "sungrow", label: "SunGrow" },
];

export function ProviderFilterTabs({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

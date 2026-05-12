import { Badge } from "@/components/ui/badge";

interface PerformanceIndicatorProps {
  indice: string | null;
  size?: "sm" | "md";
}

const CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  bom: { label: "Bom", variant: "default" },
  regular: { label: "Regular", variant: "secondary" },
  ruim: { label: "Ruim", variant: "destructive" },
};

export function PerformanceIndicator({ indice, size = "sm" }: PerformanceIndicatorProps) {
  if (!indice) return <span className="text-sm text-muted-foreground">—</span>;

  const config = CONFIG[indice];
  if (!config) return <span className="text-sm text-muted-foreground">{indice}</span>;

  return (
    <Badge variant={config.variant} className={size === "md" ? "text-sm px-3 py-1" : ""}>
      {config.label}
    </Badge>
  );
}

"use client";

import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BulkAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  className?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  processing: boolean;
}

export function BulkActionBar({
  selectedCount,
  onClear,
  actions,
  processing,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "selecionado" : "selecionados"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={processing}
          className="h-7 text-xs"
        >
          <X className="mr-1 h-3 w-3" />
          Limpar
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {processing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? "outline"}
            size="sm"
            onClick={action.onClick}
            disabled={processing}
            className={action.className}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

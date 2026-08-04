"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { triggerSyncUCs } from "@/lib/actions/solis";

const SUNGROW_SYNC_KEY = "sungrow_sync_end";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SyncUCsButton() {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  // Restore timer from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SUNGROW_SYNC_KEY);
    if (stored) {
      const remaining = Math.ceil((parseInt(stored) - Date.now()) / 1000);
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        localStorage.removeItem(SUNGROW_SYNC_KEY);
      }
    }
  }, []);

  // Countdown interval
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(SUNGROW_SYNC_KEY);
          router.refresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, router]);

  async function handleSync() {
    setLoading(true);
    try {
      const result = await triggerSyncUCs();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("UCs atualizadas com sucesso!");

      // Start 5-minute countdown for SunGrow
      const endTime = Date.now() + 300_000;
      localStorage.setItem(SUNGROW_SYNC_KEY, endTime.toString());
      setCountdown(300);

      setTimeout(() => router.refresh(), 500);
    } catch {
      toast.error("Erro inesperado ao sincronizar UCs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {countdown > 0 && (
        <Badge variant="outline" className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <Clock className="h-3 w-3" />
          SunGrow: {formatCountdown(countdown)}
        </Badge>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Atualizar UCs
      </Button>
    </div>
  );
}

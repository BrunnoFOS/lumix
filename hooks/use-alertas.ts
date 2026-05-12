"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchAlertas, type AlertaSummary } from "@/lib/actions/alertas";

const POLL_INTERVAL = 300_000; // 5 minutos

export function useAlertas() {
  const [ativos, setAtivos] = useState<number>(0);
  const [summary, setSummary] = useState<AlertaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const result = await fetchAlertas();
      if (!result.error && result.summary) {
        setAtivos(result.summary.ativos);
        setSummary(result.summary);
      }
      // Em caso de erro, manter ultimo valor conhecido (não atualizar state)
      if (result.error) {
        console.error("[useAlertas] erro:", result.error);
      }
    } catch (err) {
      console.error("[useAlertas] erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Primeira chamada imediata
    poll();

    // Polling a cada 5 min
    function startInterval() {
      stopInterval();
      intervalRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          poll();
        }
      }, POLL_INTERVAL);
    }

    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Page Visibility API — pausar quando aba inativa
    function handleVisibility() {
      isVisibleRef.current = !document.hidden;
      if (!document.hidden) {
        // Refetch ao voltar para a aba
        poll();
        startInterval();
      } else {
        stopInterval();
      }
    }

    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [poll]);

  return { ativos, summary, loading };
}

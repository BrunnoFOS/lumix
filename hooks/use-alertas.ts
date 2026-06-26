"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchAlertas, type AlertaSummary } from "@/lib/actions/alertas";

const POLL_INTERVAL = 300_000; // 5 minutos
const STALE_THRESHOLD = 30_000; // 30 segundos - nao refetch se dados tem menos de 30s

// Compartilhar estado entre instancias do hook para evitar fetches duplicados
let sharedData: { summary: AlertaSummary | null; ativos: number; fetchedAt: number } = {
  summary: null,
  ativos: 0,
  fetchedAt: 0,
};

export function useAlertas() {
  const [ativos, setAtivos] = useState<number>(sharedData.ativos);
  const [summary, setSummary] = useState<AlertaSummary | null>(sharedData.summary);
  const [loading, setLoading] = useState(sharedData.fetchedAt === 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  const poll = useCallback(async (force = false) => {
    // Pular se dados ainda sao frescos (menos de 30s)
    if (!force && Date.now() - sharedData.fetchedAt < STALE_THRESHOLD) {
      setAtivos(sharedData.ativos);
      setSummary(sharedData.summary);
      setLoading(false);
      return;
    }

    try {
      const result = await fetchAlertas();
      if (!result.error && result.summary) {
        sharedData = {
          summary: result.summary,
          ativos: result.summary.ativos,
          fetchedAt: Date.now(),
        };
        setAtivos(result.summary.ativos);
        setSummary(result.summary);
      }
    } catch (err) {
      console.error("[useAlertas] erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Primeira chamada - usa cache se fresco
    poll();

    function startInterval() {
      stopInterval();
      intervalRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          poll(true); // Polling forcado
        }
      }, POLL_INTERVAL);
    }

    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Page Visibility API - pausar quando aba inativa
    function handleVisibility() {
      isVisibleRef.current = !document.hidden;
      if (!document.hidden) {
        poll(); // Usa stale check
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

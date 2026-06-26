"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { countSugestoesPendentes } from "@/lib/actions/sugestoes-vinculacao";

const POLL_INTERVAL = 300_000; // 5 minutos
const STALE_THRESHOLD = 30_000; // 30 segundos

// Compartilhar estado entre instancias do hook
let sharedData = { count: 0, fetchedAt: 0 };

export function useSugestoesPendentes() {
  const [count, setCount] = useState<number>(sharedData.count);
  const [loading, setLoading] = useState(sharedData.fetchedAt === 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async (force = false) => {
    // Pular se dados ainda sao frescos
    if (!force && Date.now() - sharedData.fetchedAt < STALE_THRESHOLD) {
      setCount(sharedData.count);
      setLoading(false);
      return;
    }

    try {
      const result = await countSugestoesPendentes();
      sharedData = { count: result, fetchedAt: Date.now() };
      setCount(result);
    } catch (err) {
      console.error("[useSugestoesPendentes] erro:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    poll();

    function startInterval() {
      stopInterval();
      intervalRef.current = setInterval(() => {
        if (!document.hidden) poll(true);
      }, POLL_INTERVAL);
    }

    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibility() {
      if (!document.hidden) {
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

  return { count, loading };
}

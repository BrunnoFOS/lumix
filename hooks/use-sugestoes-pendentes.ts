"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { countSugestoesPendentes } from "@/lib/actions/sugestoes-vinculacao";

const POLL_INTERVAL = 300_000; // 5 minutos

export function useSugestoesPendentes() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const result = await countSugestoesPendentes();
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
        if (!document.hidden) poll();
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkRelatorioGerado } from "@/lib/actions/relatorios";

const POLL_INTERVAL = 30_000; // 30 segundos
const MAX_ATTEMPTS = 10; // 5 minutos total (10 x 30s)

type Status = "idle" | "polling" | "success" | "timeout";

export function useFaturaProcessamento() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);
  const paramsRef = useRef<{ ucId: string; mesReferencia: string } | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    attemptRef.current = 0;
    paramsRef.current = null;
  }, []);

  const poll = useCallback(async () => {
    if (!paramsRef.current) return;

    attemptRef.current += 1;
    const { ucId, mesReferencia } = paramsRef.current;

    try {
      const found = await checkRelatorioGerado(ucId, mesReferencia);

      if (found) {
        stop();
        setStatus("success");
        router.refresh();
        return;
      }
    } catch {
      // Erro de rede — continua tentando
    }

    if (attemptRef.current >= MAX_ATTEMPTS) {
      stop();
      setStatus("timeout");
    }
  }, [router, stop]);

  const start = useCallback(
    (ucId: string, mesReferencia: string) => {
      stop();
      paramsRef.current = { ucId, mesReferencia };
      attemptRef.current = 0;
      setStatus("polling");

      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          poll();
        }
      }, POLL_INTERVAL);
    },
    [stop, poll]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  // Resume polling when tab becomes visible
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && paramsRef.current && status === "polling") {
        poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [poll, status]);

  const dismiss = useCallback(() => {
    setStatus("idle");
  }, []);

  return { status, start, dismiss };
}

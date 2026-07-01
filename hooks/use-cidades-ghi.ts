"use client";

import { useState, useEffect } from "react";
import { getCidadesGHI } from "@/lib/actions/unidades";

export function useCidadesGHI(uf: string) {
  const [cidades, setCidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uf || uf.length !== 2) {
      setCidades([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getCidadesGHI(uf)
      .then((data) => {
        if (!cancelled) setCidades(data);
      })
      .catch(() => {
        if (!cancelled) setCidades([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uf]);

  return { cidades, loading };
}

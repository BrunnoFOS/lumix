"use client";

import { useState, useEffect } from "react";

interface Cidade {
  nome: string;
}

export function useCidades(uf: string) {
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uf || uf.length !== 2) {
      setCidades([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setCidades(data.map((m: { nome: string }) => ({ nome: m.nome })));
        }
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

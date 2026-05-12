"use client";

import { useState } from "react";

interface CEPData {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export function useCEPLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(cep: string): Promise<CEPData | null> {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("CEP deve ter 8 dígitos.");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) {
        setError("CEP não encontrado.");
        return null;
      }

      const data = await res.json();

      if (data.erro) {
        setError("CEP não encontrado.");
        return null;
      }

      return {
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "",
      };
    } catch {
      setError("Erro ao consultar CEP.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { lookup, loading, error };
}

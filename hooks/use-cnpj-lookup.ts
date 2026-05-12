"use client";

import { useState } from "react";

interface CNPJData {
  razao_social: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
}

export function useCNPJLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(cnpj: string): Promise<CNPJData | null> {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setError("CNPJ deve ter 14 dígitos.");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) {
        setError("CNPJ não encontrado.");
        return null;
      }

      const data = await res.json();

      const endereco = [data.logradouro, data.numero].filter(Boolean).join(", ");

      return {
        razao_social: data.razao_social || "",
        logradouro: endereco,
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        municipio: data.municipio || "",
        uf: data.uf || "",
        cep: (data.cep || "").replace(/\D/g, ""),
        telefone: data.ddd_telefone_1 || "",
        email: data.email || "",
      };
    } catch {
      setError("Erro ao consultar CNPJ.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { lookup, loading, error };
}

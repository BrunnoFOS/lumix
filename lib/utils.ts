import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatKWh(value: number): string {
  return (
    new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
    }).format(value) + " kWh"
  );
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatMesReferencia(date: string): string {
  const d = new Date(date + "T00:00:00");
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export function getMesReferenciaDate(year: number, month: number): string {
  return new Date(year, month, 1).toISOString().split("T")[0];
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (slice: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + Number(slice[i]) * w, 0);

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = ((r) => (r < 2 ? 0 : 11 - r))(calc(digits, w1) % 11);
  const d2 = ((r) => (r < 2 ? 0 : 11 - r))(calc(digits, w2) % 11);

  return Number(digits[12]) === d1 && Number(digits[13]) === d2;
}

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

/**
 * Gera o nome do arquivo para download de relatório
 * Formato: "Relatório de Geração Fotovoltaica - Real - 07/2026 - Cliente"
 */
export function gerarNomeRelatorio(
  mesReferencia: string,
  tipoRelatorio: string,
  nomeEmpresa: string
): string {
  // Extrair mês/ano de "2026-07-01"
  const [ano, mes] = mesReferencia.split("-");
  const mesAno = `${mes}/${ano}`;

  // Tipo (Real ou Estimado)
  const tipo = tipoRelatorio === "real" ? "Real" : "Estimado";

  // Abreviar nome da empresa se muito longo (máximo 50 caracteres)
  let cliente = nomeEmpresa;
  if (cliente.length > 50) {
    cliente = cliente.substring(0, 47) + "...";
  }

  return `Relatório de Geração Fotovoltaica - ${tipo} - ${mesAno} - ${cliente}.pdf`;
}

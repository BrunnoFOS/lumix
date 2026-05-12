import { describe, it, expect } from "vitest";
import {
  validateCNPJ,
  cleanCNPJ,
  formatCNPJ,
  formatCurrency,
  formatKWh,
  getMesReferenciaDate,
} from "@/lib/utils";

describe("validateCNPJ", () => {
  it("accepts valid CNPJ", () => {
    expect(validateCNPJ("11222333000181")).toBe(true);
    expect(validateCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("rejects CNPJ with wrong check digits", () => {
    expect(validateCNPJ("11222333000182")).toBe(false);
  });

  it("rejects CNPJ with all same digits", () => {
    expect(validateCNPJ("11111111111111")).toBe(false);
  });

  it("rejects CNPJ with wrong length", () => {
    expect(validateCNPJ("1234567890")).toBe(false);
    expect(validateCNPJ("")).toBe(false);
  });
});

describe("cleanCNPJ", () => {
  it("removes non-digit characters", () => {
    expect(cleanCNPJ("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("returns already clean CNPJ as-is", () => {
    expect(cleanCNPJ("11222333000181")).toBe("11222333000181");
  });
});

describe("formatCNPJ", () => {
  it("formats 14 digits to XX.XXX.XXX/XXXX-XX", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("formatCurrency", () => {
  it("formats number as BRL", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1.234,56");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0,00");
  });
});

describe("formatKWh", () => {
  it("formats with kWh suffix", () => {
    expect(formatKWh(9500)).toBe("9.500 kWh");
  });

  it("handles decimals", () => {
    expect(formatKWh(1234.56)).toBe("1.234,56 kWh");
  });
});

describe("getMesReferenciaDate", () => {
  it("returns first day of month in ISO format", () => {
    expect(getMesReferenciaDate(2026, 3)).toBe("2026-04-01");
  });

  it("handles January (month 0)", () => {
    expect(getMesReferenciaDate(2026, 0)).toBe("2026-01-01");
  });
});

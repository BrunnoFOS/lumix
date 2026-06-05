import { describe, it, expect } from "vitest";
import {
  calcularGeracaoEstimada,
  calcularDegradacaoAcumulada,
  classificarDesempenho,
  formatarPR,
  validarUCParaEstimativa,
  normalizarNomeMunicipio,
  estadoParaUF,
  diasNoMes,
} from "@/lib/geracao-estimada";

describe("diasNoMes", () => {
  it("retorna 31 para janeiro", () => {
    expect(diasNoMes(2026, 0)).toBe(31);
  });

  it("retorna 28 para fevereiro em ano normal", () => {
    expect(diasNoMes(2025, 1)).toBe(28);
  });

  it("retorna 29 para fevereiro em ano bissexto", () => {
    expect(diasNoMes(2024, 1)).toBe(29);
  });

  it("retorna 30 para abril", () => {
    expect(diasNoMes(2026, 3)).toBe(30);
  });
});

describe("normalizarNomeMunicipio", () => {
  it("remove acentos e converte para lowercase", () => {
    expect(normalizarNomeMunicipio("São Paulo")).toBe("sao paulo");
  });

  it("normaliza município com acento agudo", () => {
    expect(normalizarNomeMunicipio("Maringá")).toBe("maringa");
  });

  it("trim espaços", () => {
    expect(normalizarNomeMunicipio("  Rio de Janeiro  ")).toBe("rio de janeiro");
  });

  it("normaliza com til", () => {
    expect(normalizarNomeMunicipio("Conceição")).toBe("conceicao");
  });
});

describe("estadoParaUF", () => {
  it("retorna UF quando já é sigla de 2 chars", () => {
    expect(estadoParaUF("SP")).toBe("SP");
  });

  it("converte nome por extenso para UF", () => {
    expect(estadoParaUF("São Paulo")).toBe("SP");
    expect(estadoParaUF("Minas Gerais")).toBe("MG");
    expect(estadoParaUF("Rio de Janeiro")).toBe("RJ");
  });

  it("converte nomes com acento", () => {
    expect(estadoParaUF("Ceará")).toBe("CE");
    expect(estadoParaUF("Goiás")).toBe("GO");
    expect(estadoParaUF("Paraná")).toBe("PR");
    expect(estadoParaUF("Rondônia")).toBe("RO");
  });

  it("retorna null para estado inválido", () => {
    expect(estadoParaUF("Nenhum")).toBeNull();
  });
});

describe("calcularDegradacaoAcumulada", () => {
  const base = {
    degradacaoAnoZero: 0.02,
    degradacaoAnosSeguintes: 0.006,
  };

  it("retorna degradacao_ano_zero quando idade < 1 ano", () => {
    const result = calcularDegradacaoAcumulada({
      ...base,
      dataInstalacao: "2026-01-01",
      mesReferencia: "2026-06-01",
    });
    expect(result).toBe(0.02);
  });

  it("retorna degradacao_ano_zero quando idade = exatamente 1 ano", () => {
    const result = calcularDegradacaoAcumulada({
      ...base,
      dataInstalacao: "2025-06-01",
      mesReferencia: "2026-06-01",
    });
    // floor(1) - 1 = 0, then 0.02 + 0*0.006 = 0.02
    expect(result).toBe(0.02);
  });

  it("acumula degradação após 2 anos", () => {
    const result = calcularDegradacaoAcumulada({
      ...base,
      dataInstalacao: "2024-06-01",
      mesReferencia: "2026-06-01",
    });
    // floor(2) - 1 = 1, then 0.02 + 1*0.006 = 0.026
    expect(result).toBeCloseTo(0.026, 6);
  });

  it("acumula degradação após 5 anos", () => {
    const result = calcularDegradacaoAcumulada({
      ...base,
      dataInstalacao: "2021-06-01",
      mesReferencia: "2026-06-01",
    });
    // floor(5) - 1 = 4, then 0.02 + 4*0.006 = 0.044
    expect(result).toBeCloseTo(0.044, 6);
  });

  it("retorna 0 se usina ainda não foi instalada", () => {
    const result = calcularDegradacaoAcumulada({
      ...base,
      dataInstalacao: "2027-01-01",
      mesReferencia: "2026-06-01",
    });
    expect(result).toBe(0);
  });
});

describe("calcularGeracaoEstimada", () => {
  it("calcula corretamente a geração estimada", () => {
    // Potência: 100 kWp, GHI: 5000 Wh/m²/dia = 5 kWh/m²/dia
    // 30 dias, fator rendimento: 0.95, degradação: 0.02
    const result = calcularGeracaoEstimada({
      potenciaKwp: 100,
      ghiWhM2Dia: 5000,
      diasNoMes: 30,
      fatorRendimento: 0.95,
      degradacaoAcumulada: 0.02,
    });
    // 100 * 5 * 30 * 0.95 * 0.98 = 13965
    expect(result).toBeCloseTo(13965, 1);
  });

  it("retorna 0 se potência é 0", () => {
    const result = calcularGeracaoEstimada({
      potenciaKwp: 0,
      ghiWhM2Dia: 5000,
      diasNoMes: 30,
      fatorRendimento: 0.95,
      degradacaoAcumulada: 0.02,
    });
    expect(result).toBe(0);
  });

  it("aplica degradação corretamente", () => {
    const semDegradacao = calcularGeracaoEstimada({
      potenciaKwp: 10,
      ghiWhM2Dia: 4000,
      diasNoMes: 31,
      fatorRendimento: 1.0,
      degradacaoAcumulada: 0,
    });
    const comDegradacao = calcularGeracaoEstimada({
      potenciaKwp: 10,
      ghiWhM2Dia: 4000,
      diasNoMes: 31,
      fatorRendimento: 1.0,
      degradacaoAcumulada: 0.05,
    });
    expect(comDegradacao).toBeCloseTo(semDegradacao * 0.95, 1);
  });
});

describe("classificarDesempenho", () => {
  it("classifica como bom quando PR >= 98%", () => {
    expect(classificarDesempenho(98)).toBe("bom");
    expect(classificarDesempenho(100)).toBe("bom");
    expect(classificarDesempenho(105)).toBe("bom");
  });

  it("classifica como regular quando 90% <= PR < 98%", () => {
    expect(classificarDesempenho(90)).toBe("regular");
    expect(classificarDesempenho(95)).toBe("regular");
    expect(classificarDesempenho(97.9)).toBe("regular");
  });

  it("classifica como ruim quando PR < 90%", () => {
    expect(classificarDesempenho(89.9)).toBe("ruim");
    expect(classificarDesempenho(50)).toBe("ruim");
    expect(classificarDesempenho(0)).toBe("ruim");
  });
});

describe("formatarPR", () => {
  it("formata PR bom", () => {
    expect(formatarPR(99.5)).toBe(
      "100% do potencial da usina foi atingido — Bom"
    );
  });

  it("formata PR regular", () => {
    expect(formatarPR(92.3)).toBe(
      "92% do potencial da usina foi atingido — Regular"
    );
  });

  it("formata PR ruim", () => {
    expect(formatarPR(82)).toBe(
      "82% do potencial da usina foi atingido — Ruim"
    );
  });
});

describe("validarUCParaEstimativa", () => {
  const ucCompleta = {
    potencia_instalada_kwp: 100,
    cidade: "São Paulo",
    estado: "SP",
    fator_rendimento: 0.95,
    degradacao_ano_zero: 0.02,
    degradacao_anos_seguintes: 0.006,
    data_instalacao: "2024-01-15",
  };

  it("retorna valid true quando todos os campos preenchidos", () => {
    expect(validarUCParaEstimativa(ucCompleta)).toEqual({ valid: true });
  });

  it("retorna campos faltantes quando fator_rendimento é null", () => {
    const result = validarUCParaEstimativa({
      ...ucCompleta,
      fator_rendimento: null,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toContain("Fator de rendimento");
    }
  });

  it("retorna múltiplos campos faltantes", () => {
    const result = validarUCParaEstimativa({
      ...ucCompleta,
      cidade: null,
      data_instalacao: null,
      degradacao_ano_zero: null,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toHaveLength(3);
      expect(result.camposFaltantes).toContain("Cidade");
      expect(result.camposFaltantes).toContain("Data de instalação");
      expect(result.camposFaltantes).toContain("Degradação ano zero");
    }
  });

  it("retorna todos os campos quando UC está vazia", () => {
    const result = validarUCParaEstimativa({
      potencia_instalada_kwp: null,
      cidade: null,
      estado: null,
      fator_rendimento: null,
      degradacao_ano_zero: null,
      degradacao_anos_seguintes: null,
      data_instalacao: null,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toHaveLength(7);
    }
  });
});

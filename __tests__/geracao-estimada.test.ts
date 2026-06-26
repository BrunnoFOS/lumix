import { describe, it, expect } from "vitest";
import { validarUCParaRelatorio } from "@/lib/geracao-estimada";

describe("validarUCParaRelatorio", () => {
  const ucCompleta = {
    grupo_tarifario: "grupo_b",
    subgrupo: "B1",
    concessionaria_sigla: "CEMIG",
    modalidade_tarifaria_aneel: "Convencional",
    icms_aliquota: 0.18,
    pis_aliquota: 0.0165,
    cofins_aliquota: 0.076,
    contrato_acl_rs_mwh: null,
  };

  it("retorna valid para UC com todos os campos preenchidos", () => {
    const result = validarUCParaRelatorio(ucCompleta);
    expect(result.valid).toBe(true);
  });

  it("retorna campos faltantes quando grupo_tarifario é null", () => {
    const result = validarUCParaRelatorio({ ...ucCompleta, grupo_tarifario: null });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toContain("Grupo tarifário");
    }
  });

  it("retorna campos faltantes quando concessionaria_sigla é null", () => {
    const result = validarUCParaRelatorio({ ...ucCompleta, concessionaria_sigla: null });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toContain("Concessionária (sigla ANEEL)");
    }
  });

  it("retorna campos faltantes quando subgrupo é null", () => {
    const result = validarUCParaRelatorio({ ...ucCompleta, subgrupo: null });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toContain("Subgrupo tarifário");
    }
  });

  it("retorna campos faltantes quando modalidade_tarifaria_aneel é null", () => {
    const result = validarUCParaRelatorio({ ...ucCompleta, modalidade_tarifaria_aneel: null });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toContain("Modalidade tarifária ANEEL");
    }
  });

  it("retorna campos faltantes quando alíquotas de impostos são null", () => {
    const result = validarUCParaRelatorio({
      ...ucCompleta,
      icms_aliquota: null,
      pis_aliquota: null,
      cofins_aliquota: null,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toContain("Alíquota ICMS");
      expect(result.camposFaltantes).toContain("Alíquota PIS");
      expect(result.camposFaltantes).toContain("Alíquota COFINS");
    }
  });

  it("aceita alíquota zero como valor válido", () => {
    const result = validarUCParaRelatorio({
      ...ucCompleta,
      icms_aliquota: 0,
      pis_aliquota: 0,
      cofins_aliquota: 0,
    });
    expect(result.valid).toBe(true);
  });

  it("exige contrato ACL quando grupo_tarifario é acl", () => {
    const ucAcl = {
      ...ucCompleta,
      grupo_tarifario: "acl",
      contrato_acl_rs_mwh: null,
    };
    const result = validarUCParaRelatorio(ucAcl);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toContain("Contrato ACL (R$/MWh)");
    }
  });

  it("aceita UC ACL com contrato preenchido", () => {
    const ucAcl = {
      ...ucCompleta,
      grupo_tarifario: "acl",
      contrato_acl_rs_mwh: 250.0,
    };
    const result = validarUCParaRelatorio(ucAcl);
    expect(result.valid).toBe(true);
  });

  it("lista múltiplos campos faltantes de uma vez", () => {
    const ucVazia = {
      grupo_tarifario: null,
      subgrupo: null,
      concessionaria_sigla: null,
      modalidade_tarifaria_aneel: null,
      icms_aliquota: null,
      pis_aliquota: null,
      cofins_aliquota: null,
      contrato_acl_rs_mwh: null,
    };
    const result = validarUCParaRelatorio(ucVazia);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.camposFaltantes).toHaveLength(7);
    }
  });
});

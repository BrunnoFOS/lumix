import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRelatorio } from "@/lib/actions/relatorios";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "test-relatorio-id" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(function (this: unknown) {
          return this;
        }),
        single: vi.fn(() => ({ data: null, error: null })),
        order: vi.fn(function (this: unknown) {
          return this;
        }),
        in: vi.fn(function (this: unknown) {
          return this;
        }),
      })),
    })),
    auth: { getUser: vi.fn(() => ({ data: { user: { id: "user-1" } } })) },
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("createRelatorio", () => {
  let formData: FormData;

  beforeEach(() => {
    formData = new FormData();
    formData.set("uc_id", "uc-789");
    formData.set("empresa_id", "empresa-123");
    formData.set("mes_referencia", "2026-04-01");
    formData.set("titulo", "Relatório Abril 2026");
  });

  it("deve retornar erro quando uc_id está ausente", async () => {
    formData.delete("uc_id");
    const result = await createRelatorio(formData);
    expect(result.error).toBe("UC, empresa, mês de referência e título são obrigatórios.");
  });

  it("deve retornar erro quando empresa_id está ausente", async () => {
    formData.delete("empresa_id");
    const result = await createRelatorio(formData);
    expect(result.error).toBe("UC, empresa, mês de referência e título são obrigatórios.");
  });

  it("deve retornar erro quando mes_referencia está ausente", async () => {
    formData.delete("mes_referencia");
    const result = await createRelatorio(formData);
    expect(result.error).toBe("UC, empresa, mês de referência e título são obrigatórios.");
  });

  it("deve retornar erro quando titulo está ausente", async () => {
    formData.delete("titulo");
    const result = await createRelatorio(formData);
    expect(result.error).toBe("UC, empresa, mês de referência e título são obrigatórios.");
  });

  it("deve retornar erro quando todos os campos obrigatórios estão ausentes", async () => {
    formData.delete("uc_id");
    formData.delete("empresa_id");
    formData.delete("mes_referencia");
    formData.delete("titulo");
    const result = await createRelatorio(formData);
    expect(result.error).toBe("UC, empresa, mês de referência e título são obrigatórios.");
  });

  it("deve aceitar relatório válido com apenas campos obrigatórios", async () => {
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe("test-relatorio-id");
  });

  it("deve aceitar relatório com geracao_kwh", async () => {
    formData.set("geracao_kwh", "9500");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar relatório com geracao_estimada_kwh", async () => {
    formData.set("geracao_estimada_kwh", "10000");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar relatório com economia_reais", async () => {
    formData.set("economia_reais", "1500.50");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar indice_performance bom", async () => {
    formData.set("indice_performance", "bom");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar indice_performance regular", async () => {
    formData.set("indice_performance", "regular");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar indice_performance ruim", async () => {
    formData.set("indice_performance", "ruim");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar fatura_id", async () => {
    formData.set("fatura_id", "fatura-999");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar todos os campos opcionais", async () => {
    formData.set("geracao_kwh", "9500");
    formData.set("geracao_estimada_kwh", "10000");
    formData.set("economia_reais", "1500.50");
    formData.set("indice_performance", "bom");
    formData.set("fatura_id", "fatura-999");
    const result = await createRelatorio(formData);
    expect(result.error).toBeUndefined();
  });
});

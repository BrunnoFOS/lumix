import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFatura, createFaturaCliente } from "@/lib/actions/faturas";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => {
    const profileChain = {
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: { role: "admin" }, error: null })),
      })),
    };
    return {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => profileChain),
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: { id: "test-fatura-id" }, error: null })),
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
        };
      }),
      auth: { getUser: vi.fn(() => ({ data: { user: { id: "user-1" } } })) },
    };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock global fetch para o webhook não disparar nos testes
const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));

describe("createFatura", () => {
  let formData: FormData;

  beforeEach(() => {
    fetchSpy.mockClear();
    formData = new FormData();
    formData.set("uc_id", "uc-123");
    formData.set("mes_referencia", "2026-04-01");
    formData.set("valor_total", "350.50");
    formData.set("consumo_kwh", "500");
  });

  it("deve retornar erro quando uc_id está ausente", async () => {
    formData.delete("uc_id");
    const result = await createFatura(formData);
    expect(result.error).toBe("UC e mês de referência são obrigatórios.");
  });

  it("deve retornar erro quando mes_referencia está ausente", async () => {
    formData.delete("mes_referencia");
    const result = await createFatura(formData);
    expect(result.error).toBe("UC e mês de referência são obrigatórios.");
  });

  it("deve retornar erro quando ambos uc_id e mes_referencia estão ausentes", async () => {
    formData.delete("uc_id");
    formData.delete("mes_referencia");
    const result = await createFatura(formData);
    expect(result.error).toBe("UC e mês de referência são obrigatórios.");
  });

  it("deve aceitar fatura válida com campos obrigatórios", async () => {
    const result = await createFatura(formData);
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe("test-fatura-id");
  });

  it("deve aceitar campos opcionais nulos", async () => {
    formData.delete("valor_total");
    formData.delete("consumo_kwh");
    const result = await createFatura(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar energia_injetada_kwh", async () => {
    formData.set("energia_injetada_kwh", "200");
    const result = await createFatura(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar creditos_energia_kwh", async () => {
    formData.set("creditos_energia_kwh", "150");
    const result = await createFatura(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar economia_estimada", async () => {
    formData.set("economia_estimada", "450.00");
    const result = await createFatura(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve enviar webhook quando há arquivo anexo (pdf_url)", async () => {
    formData.set("pdf_url", "https://ukobyfxffhtlywzmtaiq.supabase.co/storage/v1/object/public/faturas/test.pdf");
    const result = await createFatura(formData);
    expect(result.error).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("webhook"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.fatura_id).toBe("test-fatura-id");
    expect(body.role).toBe("admin");
    expect(body.arquivo_url).toContain("supabase.co");
  });

  it("deve enviar webhook mesmo sem arquivo", async () => {
    const result = await createFatura(formData);
    expect(result.error).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalled();
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.arquivo_url).toBeNull();
  });
});

describe("createFaturaCliente", () => {
  let formData: FormData;

  beforeEach(() => {
    fetchSpy.mockClear();
    formData = new FormData();
    formData.set("uc_id", "uc-456");
    formData.set("mes_referencia", "2026-03-01");
  });

  it("deve retornar erro quando uc_id está ausente", async () => {
    formData.delete("uc_id");
    const result = await createFaturaCliente(formData);
    expect(result.error).toBe("UC e mês de referência são obrigatórios.");
  });

  it("deve retornar erro quando mes_referencia está ausente", async () => {
    formData.delete("mes_referencia");
    const result = await createFaturaCliente(formData);
    expect(result.error).toBe("UC e mês de referência são obrigatórios.");
  });

  it("deve aceitar fatura cliente válida sem imagem", async () => {
    const result = await createFaturaCliente(formData);
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe("test-fatura-id");
  });

  it("deve aceitar fatura cliente com imagem_url", async () => {
    formData.set("imagem_url", "https://storage.example.com/fatura.jpg");
    const result = await createFaturaCliente(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve aceitar imagem_url vazia", async () => {
    formData.set("imagem_url", "");
    const result = await createFaturaCliente(formData);
    expect(result.error).toBeUndefined();
  });

  it("deve enviar webhook com role cliente quando há imagem", async () => {
    formData.set("imagem_url", "https://ukobyfxffhtlywzmtaiq.supabase.co/storage/v1/object/public/faturas/img.jpg");
    const result = await createFaturaCliente(formData);
    expect(result.error).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalled();
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.role).toBe("cliente");
    expect(body.arquivo_url).toContain("supabase.co");
  });

  it("deve enviar webhook mesmo sem arquivo", async () => {
    const result = await createFaturaCliente(formData);
    expect(result.error).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalled();
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.arquivo_url).toBeNull();
    expect(body.role).toBe("cliente");
  });
});

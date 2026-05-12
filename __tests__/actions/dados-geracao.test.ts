import { describe, it, expect, vi } from "vitest";
import { getResumoGeracaoCliente } from "@/lib/actions/dados-geracao";

const mockSupabaseData: {
  ucs: { id: string; codigo_uc: string; geracao_estimada_mensal_kwh: number }[];
  geracoes: { uc_id: string; geracao_kwh: number; geracao_estimada_kwh: number; performance_ratio: number | null; indice_performance: string | null }[];
  faturas: { uc_id: string; economia_estimada: number }[];
} = {
  ucs: [
    { id: "uc-1", codigo_uc: "UC001", geracao_estimada_mensal_kwh: 10000 },
    { id: "uc-2", codigo_uc: "UC002", geracao_estimada_mensal_kwh: 8000 },
  ],
  geracoes: [
    {
      uc_id: "uc-1",
      geracao_kwh: 9500,
      geracao_estimada_kwh: 10000,
      performance_ratio: 85,
      indice_performance: "bom",
    },
    {
      uc_id: "uc-2",
      geracao_kwh: 5000,
      geracao_estimada_kwh: 8000,
      performance_ratio: 50,
      indice_performance: "ruim",
    },
  ],
  faturas: [
    { uc_id: "uc-1", economia_estimada: 1200 },
    { uc_id: "uc-2", economia_estimada: 800 },
  ],
};

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "unidades_consumidoras") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(function (this: unknown) {
                return this;
              }),
              data: mockSupabaseData.ucs,
            })),
            eq: vi.fn(function (this: unknown) {
              return this;
            }),
            data: mockSupabaseData.ucs,
          })),
        };
      }
      if (table === "dados_geracao") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({ data: mockSupabaseData.geracoes })),
            })),
          })),
        };
      }
      if (table === "faturas") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => ({ data: mockSupabaseData.faturas })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({ data: [], error: null })),
      };
    }),
    auth: { getUser: vi.fn(() => ({ data: { user: { id: "user-1" } } })) },
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("getResumoGeracaoCliente", () => {
  it("deve calcular geracao_total somando todas as gerações", async () => {
    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    // 9500 + 5000 = 14500
    expect(result.geracao_total).toBe(14500);
  });

  it("deve calcular estimada_total somando todas as estimativas", async () => {
    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    // 10000 + 8000 = 18000
    expect(result.estimada_total).toBe(18000);
  });

  it("deve calcular economia_total somando todas as economias", async () => {
    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    // 1200 + 800 = 2000
    expect(result.economia_total).toBe(2000);
  });

  it("deve classificar performance como bom quando ratio >= 80", async () => {
    // Mock com performance_ratio 85 e 80 (média 82.5)
    mockSupabaseData.geracoes = [
      {
        uc_id: "uc-1",
        geracao_kwh: 8500,
        geracao_estimada_kwh: 10000,
        performance_ratio: 85,
        indice_performance: "bom",
      },
      {
        uc_id: "uc-2",
        geracao_kwh: 6400,
        geracao_estimada_kwh: 8000,
        performance_ratio: 80,
        indice_performance: "bom",
      },
    ];

    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    expect(result.performance).toBe("bom");
    expect(result.performance_ratio).toBe(82.5);
  });

  it("deve classificar performance como regular quando 60 <= ratio < 80", async () => {
    // Mock com performance_ratio 70 e 65 (média 67.5)
    mockSupabaseData.geracoes = [
      {
        uc_id: "uc-1",
        geracao_kwh: 7000,
        geracao_estimada_kwh: 10000,
        performance_ratio: 70,
        indice_performance: "regular",
      },
      {
        uc_id: "uc-2",
        geracao_kwh: 5200,
        geracao_estimada_kwh: 8000,
        performance_ratio: 65,
        indice_performance: "regular",
      },
    ];

    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    expect(result.performance).toBe("regular");
    expect(result.performance_ratio).toBe(67.5);
  });

  it("deve classificar performance como ruim quando ratio < 60", async () => {
    // Mock com performance_ratio 50 e 40 (média 45)
    mockSupabaseData.geracoes = [
      {
        uc_id: "uc-1",
        geracao_kwh: 5000,
        geracao_estimada_kwh: 10000,
        performance_ratio: 50,
        indice_performance: "ruim",
      },
      {
        uc_id: "uc-2",
        geracao_kwh: 3200,
        geracao_estimada_kwh: 8000,
        performance_ratio: 40,
        indice_performance: "ruim",
      },
    ];

    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    expect(result.performance).toBe("ruim");
    expect(result.performance_ratio).toBe(45);
  });

  it("deve retornar performance null quando não há dados de performance_ratio", async () => {
    // Mock sem performance_ratio
    mockSupabaseData.geracoes = [
      {
        uc_id: "uc-1",
        geracao_kwh: 9500,
        geracao_estimada_kwh: 10000,
        performance_ratio: null,
        indice_performance: null,
      },
    ];

    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    expect(result.performance).toBe(null);
    expect(result.performance_ratio).toBe(null);
  });

  it("deve retornar zeros quando não há UCs", async () => {
    mockSupabaseData.ucs = [];

    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    expect(result.geracao_total).toBe(0);
    expect(result.estimada_total).toBe(0);
    expect(result.economia_total).toBe(0);
    expect(result.performance).toBe(null);
    expect(result.ucs).toEqual([]);
  });

  it("deve incluir array de UCs com dados individuais", async () => {
    mockSupabaseData.ucs = [
      { id: "uc-1", codigo_uc: "UC001", geracao_estimada_mensal_kwh: 10000 },
    ];
    mockSupabaseData.geracoes = [
      {
        uc_id: "uc-1",
        geracao_kwh: 9500,
        geracao_estimada_kwh: 10000,
        performance_ratio: 85,
        indice_performance: "bom",
      },
    ];

    const result = await getResumoGeracaoCliente("empresa-1", "2026-04-01");
    expect(result.ucs).toHaveLength(1);
    expect(result.ucs[0].id).toBe("uc-1");
    expect(result.ucs[0].codigo_uc).toBe("UC001");
    expect(result.ucs[0].geracao_kwh).toBe(9500);
    expect(result.ucs[0].geracao_estimada_kwh).toBe(10000);
    expect(result.ucs[0].indice_performance).toBe("bom");
  });
});

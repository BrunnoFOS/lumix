import { FaturaForm } from "@/components/admin/FaturaForm";
import { createServerClient } from "@/lib/supabase/server";
import { getUCsComSolis } from "@/lib/actions/solis";
import { getEmpresas } from "@/lib/actions/empresas";

export default async function NovaFaturaPage() {
  const supabase = await createServerClient();

  const { data: rawUcs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, empresa:empresas(id, nome)")
    .eq("ativa", true)
    .order("codigo_uc");

  const dbUcs = (rawUcs ?? []).map((uc) => {
    const empresaRaw = uc.empresa as unknown;
    return {
      id: uc.id,
      codigo_uc: uc.codigo_uc,
      empresa: (Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw) as { id: string; nome: string } | null,
    };
  });

  const [ucs, empresas] = await Promise.all([
    getUCsComSolis(dbUcs),
    getEmpresas(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inserir Fatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Insira os dados da fatura manualmente
        </p>
      </div>

      <FaturaForm
        ucs={ucs}
        clientes={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
      />
    </div>
  );
}

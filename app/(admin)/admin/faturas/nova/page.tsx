import { FaturaForm } from "@/components/admin/FaturaForm";
import { createServerClient } from "@/lib/supabase/server";
import { getEmpresas } from "@/lib/actions/empresas";

export default async function NovaFaturaPage() {
  const supabase = await createServerClient();

  const { data: rawUcs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, station_id, empresa:empresas(id, nome)")
    .eq("ativa", true)
    .order("codigo_uc");

  const ucs = (rawUcs ?? []).map((uc) => {
    const empresaRaw = uc.empresa as unknown;
    return {
      id: uc.id,
      codigo_uc: uc.codigo_uc,
      station_id: uc.station_id as string | null,
      empresa: (Array.isArray(empresaRaw) ? empresaRaw[0] ?? null : empresaRaw) as { id: string; nome: string } | null,
    };
  });

  const empresas = await getEmpresas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inserir Fatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione a UC e o mês — os dados de geração serão buscados automaticamente.
        </p>
      </div>

      <FaturaForm
        ucs={ucs}
        clientes={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
      />
    </div>
  );
}

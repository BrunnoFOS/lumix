import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getUCsCliente, getInversoresCliente } from "@/lib/actions/dados-geracao";
import { createServerClient } from "@/lib/supabase/server";
import { UsinaDetails } from "@/components/cliente/UsinaDetails";

export default async function UsinaPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  // Buscar UCs e IDs de UC em paralelo com uma unica query
  const supabase = await createServerClient();
  const { data: ucs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, titular, endereco, cidade, estado, distribuidora, enquadramento_tarifario, modalidade_tarifaria, potencia_instalada_kwp, quantidade_modulos, modelo_modulos, potencia_modulo_w, quantidade_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, geracao_estimada_mensal_kwh, ativa, observacoes")
    .eq("empresa_id", profile.empresa_id)
    .eq("ativa", true)
    .order("codigo_uc");

  const ucsList = ucs ?? [];
  const ucIds = ucsList.map((uc) => uc.id);

  // Buscar inversores em paralelo (nao precisa esperar getUCsCliente)
  const inversoresData = await getInversoresCliente(ucIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dados da Usina</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informações técnicas do sistema fotovoltaico
        </p>
      </div>

      <UsinaDetails ucs={ucsList} inversoresData={inversoresData} />
    </div>
  );
}

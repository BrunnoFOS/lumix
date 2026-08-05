import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getInversoresCliente } from "@/lib/actions/dados-geracao";
import { createServerClient } from "@/lib/supabase/server";
import { UsinaDetails } from "@/components/cliente/UsinaDetails";

export default async function UsinaPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  const supabase = await createServerClient();

  // Fetch UCs first (needed for uc_stations query)
  const { data: ucs } = await supabase
    .from("unidades_consumidoras")
    .select("id, codigo_uc, titular, endereco, cidade, estado, distribuidora, enquadramento_tarifario, modalidade_tarifaria, grupo_tarifario, subgrupo, potencia_instalada_kwp, quantidade_modulos, modelo_modulos, potencia_modulo_w, quantidade_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, geracao_estimada_mensal_kwh, fator_rendimento, degradacao_ano_zero, degradacao_anos_seguintes, data_inicio_degradacao, ativa, observacoes")
    .eq("empresa_id", profile.empresa_id)
    .eq("ativa", true)
    .order("codigo_uc");

  const ucsList = ucs ?? [];
  const ucIds = ucsList.map((uc) => uc.id);

  // Parallelize uc_stations + inversores (both depend only on ucIds)
  const [{ data: ucStations }, inversoresData] = await Promise.all([
    ucIds.length > 0
      ? supabase.from("uc_stations").select("uc_id, station_id, provider").in("uc_id", ucIds)
      : Promise.resolve({ data: [] as { uc_id: string; station_id: string; provider: string }[] }),
    getInversoresCliente(ucIds),
  ]);

  // Fetch usinas_cache (depends on ucStations result)
  const stationIds = (ucStations ?? []).map((s) => s.station_id);
  const { data: usinasCache } = stationIds.length > 0
    ? await supabase
        .from("usinas_cache")
        .select("station_id, station_name, cidade_uf, potencia_instalada_kwp, qtd_inversores, modelo_inversores, potencia_inversor_kw, data_instalacao, synced_at")
        .in("station_id", stationIds)
    : { data: [] as never[] };

  // Montar mapa de stations por UC
  const stationsMap = new Map<string, Array<{
    station_id: string;
    provider: string;
    station_name: string;
    cidade_uf: string | null;
    potencia_kwp: number;
    qtd_inversores: number;
    modelo_inversores: string[] | null;
    potencia_inversor_kw: number | null;
    synced_at: string | null;
  }>>();

  const cacheMap = new Map((usinasCache ?? []).map((c) => [c.station_id, c]));

  for (const st of (ucStations ?? [])) {
    const cached = cacheMap.get(st.station_id);
    const entry = {
      station_id: st.station_id,
      provider: st.provider,
      station_name: cached?.station_name ?? "",
      cidade_uf: cached?.cidade_uf ?? null,
      potencia_kwp: cached?.potencia_instalada_kwp ?? 0,
      qtd_inversores: cached?.qtd_inversores ?? 0,
      modelo_inversores: cached?.modelo_inversores ?? null,
      potencia_inversor_kw: cached?.potencia_inversor_kw ?? null,
      synced_at: cached?.synced_at ?? null,
    };
    const list = stationsMap.get(st.uc_id) ?? [];
    list.push(entry);
    stationsMap.set(st.uc_id, list);
  }

  // Converter Map para objeto serializável
  const stationsData: Record<string, typeof stationsMap extends Map<string, infer V> ? V : never> = {};
  for (const [ucId, stations] of stationsMap) {
    stationsData[ucId] = stations;
  }

  // Totais para o resumo
  const totalPotencia = ucsList.reduce((sum, uc) => sum + (uc.potencia_instalada_kwp ?? 0), 0);
  const totalModulos = ucsList.reduce((sum, uc) => sum + (uc.quantidade_modulos ?? 0), 0);
  const totalInversores = ucsList.reduce((sum, uc) => sum + (uc.quantidade_inversores ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dados da Usina</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informações técnicas do sistema fotovoltaico
        </p>
      </div>

      <UsinaDetails
        ucs={ucsList}
        inversoresData={inversoresData}
        stationsData={stationsData}
        totais={{ potencia: totalPotencia, modulos: totalModulos, inversores: totalInversores, ucs: ucsList.length }}
      />
    </div>
  );
}

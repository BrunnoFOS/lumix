import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { FaturaProcessadaDetalhe } from "./detalhe-client";
import { getFaturaProcessada } from "@/lib/actions/faturas-processadas";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FaturaProcessadaDetalhePage({ params }: Props) {
  const { id } = await params;
  const fatura = await getFaturaProcessada(id);

  if (!fatura) notFound();

  // Buscar admin logado
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolver grupo tarifário da UC
  const ucRaw = fatura.uc as unknown;
  const uc = (Array.isArray(ucRaw) ? ucRaw[0] : ucRaw) as {
    id: string;
    codigo_uc: string;
    grupo_tarifario: string | null;
    empresa: { id: string; nome: string } | { id: string; nome: string }[] | null;
  } | null;

  const isGrupoA = uc?.grupo_tarifario === "grupo_a";

  let empresaNome = "";
  if (uc?.empresa) {
    const emp = Array.isArray(uc.empresa) ? uc.empresa[0] : uc.empresa;
    empresaNome = emp?.nome ?? "";
  }

  return (
    <FaturaProcessadaDetalhe
      fatura={fatura}
      ucCodigo={uc?.codigo_uc ?? "—"}
      empresaNome={empresaNome}
      isGrupoA={isGrupoA}
      adminId={user?.id ?? ""}
    />
  );
}

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getRelatoriosCliente } from "@/lib/actions/relatorios";
import { getUCsCliente } from "@/lib/actions/dados-geracao";
import { RelatorioList } from "@/components/cliente/RelatorioList";

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function HistoricoPage({ searchParams }: Props) {
  const [profile, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  const ucId = params.uc || undefined;
  const mesInicio = params.inicio ? `${params.inicio}-01` : undefined;
  const mesFim = params.fim ? `${params.fim}-01` : undefined;

  const [relatorios, ucs] = await Promise.all([
    getRelatoriosCliente(profile.empresa_id, { ucId, mesInicio, mesFim }),
    getUCsCliente(profile.empresa_id),
  ]);

  const ucOptions = ucs.map((uc) => ({
    value: uc.id,
    label: `UC ${uc.codigo_uc}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Historico de Relatorios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {relatorios.length} relatorio{relatorios.length !== 1 && "s"} disponive{relatorios.length !== 1 ? "is" : "l"}
        </p>
      </div>

      <RelatorioList relatorios={relatorios} ucOptions={ucOptions} />
    </div>
  );
}

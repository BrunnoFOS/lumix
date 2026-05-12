import { redirect } from "next/navigation";
import { getCurrentProfile, getEmpresaIdsAcessiveis } from "@/lib/actions/profile";
import { getRelatoriosCliente } from "@/lib/actions/relatorios";
import { RelatorioList } from "@/components/cliente/RelatorioList";

export default async function HistoricoPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  const empresaIds = await getEmpresaIdsAcessiveis(profile.empresa_id);
  const relatorios = await getRelatoriosCliente(empresaIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico de Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {relatorios.length} relatório{relatorios.length !== 1 && "s"} disponíve{relatorios.length !== 1 ? "is" : "l"}
        </p>
      </div>

      <RelatorioList relatorios={relatorios} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentProfile, getEmpresaIdsAcessiveis } from "@/lib/actions/profile";
import { getUCsCliente } from "@/lib/actions/dados-geracao";
import { UsinaDetails } from "@/components/cliente/UsinaDetails";

export default async function UsinaPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  const empresaIds = await getEmpresaIdsAcessiveis(profile.empresa_id);
  const ucs = await getUCsCliente(empresaIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dados da Usina</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informações técnicas do sistema fotovoltaico
        </p>
      </div>

      <UsinaDetails ucs={ucs} />
    </div>
  );
}

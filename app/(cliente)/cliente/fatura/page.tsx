import { redirect } from "next/navigation";
import { getCurrentProfile, getEmpresaIdsAcessiveis } from "@/lib/actions/profile";
import { getUCsCliente } from "@/lib/actions/dados-geracao";
import { getFaturasCliente } from "@/lib/actions/faturas";
import { FaturaUpload } from "@/components/cliente/FaturaUpload";
import { FaturaList } from "@/components/cliente/FaturaList";

export default async function FaturaPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  const empresaIds = await getEmpresaIdsAcessiveis(profile.empresa_id);
  const [ucs, faturas] = await Promise.all([
    getUCsCliente(empresaIds),
    getFaturasCliente(empresaIds),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload de Fatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie a imagem da sua fatura de energia
        </p>
      </div>

      <FaturaUpload
        ucs={ucs.map((uc) => ({ id: uc.id, codigo_uc: uc.codigo_uc }))}
        empresaId={profile.empresa_id}
      />

      <FaturaList faturas={faturas} />
    </div>
  );
}

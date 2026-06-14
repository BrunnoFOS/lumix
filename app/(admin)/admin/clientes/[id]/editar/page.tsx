import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { ClienteForm } from "@/components/admin/ClienteForm";
import { getEmpresa } from "@/lib/actions/empresas";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params;
  const empresa = await getEmpresa(id);

  if (!empresa) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <LinkButton variant="ghost" size="icon" href={`/admin/clientes/${id}`}>
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar cliente</h1>
          <p className="mt-1 text-sm text-muted-foreground">{empresa.nome}</p>
        </div>
      </div>
      <ClienteForm empresa={empresa} />
    </div>
  );
}

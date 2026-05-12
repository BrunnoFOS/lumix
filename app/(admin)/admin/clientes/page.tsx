import { Suspense } from "react";
import { Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { ClienteTable } from "@/components/admin/ClienteTable";
import { ClienteSearch } from "@/components/admin/ClienteSearch";
import { getEmpresas } from "@/lib/actions/empresas";

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export default async function ClientesPage({ searchParams }: Props) {
  const params = await searchParams;
  const empresas = await getEmpresas(params.search, params.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {empresas.length} cliente{empresas.length !== 1 && "s"}
          </p>
        </div>
        <LinkButton href="/admin/clientes/novo">
          <Plus className="mr-2 h-4 w-4" />
          Novo cliente
        </LinkButton>
      </div>

      <Suspense>
        <ClienteSearch />
      </Suspense>

      <ClienteTable empresas={empresas} />
    </div>
  );
}

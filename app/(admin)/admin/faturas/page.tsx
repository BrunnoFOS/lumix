import { Suspense } from "react";
import { Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { FaturaTable } from "@/components/admin/FaturaTable";
import { FaturaSearch } from "@/components/admin/FaturaSearch";
import { getFaturas } from "@/lib/actions/faturas";
import { getEmpresas } from "@/lib/actions/empresas";

interface Props {
  searchParams: Promise<{ search?: string; status?: string; empresa?: string }>;
}

export default async function FaturasPage({ searchParams }: Props) {
  const params = await searchParams;
  const [faturas, empresas] = await Promise.all([
    getFaturas(params.search, params.status, params.empresa),
    getEmpresas(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {faturas.length} fatura{faturas.length !== 1 && "s"}
          </p>
        </div>
        <LinkButton href="/admin/faturas/nova">
          <Plus className="mr-2 h-4 w-4" />
          Inserir fatura
        </LinkButton>
      </div>

      <Suspense>
        <FaturaSearch
          empresas={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
        />
      </Suspense>

      <FaturaTable faturas={faturas} />
    </div>
  );
}

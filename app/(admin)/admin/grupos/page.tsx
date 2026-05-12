import { getGrupos } from "@/lib/actions/grupos";
import { GrupoPageClient } from "@/components/admin/GrupoPageClient";

export default async function GruposPage() {
  const grupos = await getGrupos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Grupos Empresariais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {grupos.length} grupo{grupos.length !== 1 && "s"}
        </p>
      </div>

      <GrupoPageClient grupos={grupos} />
    </div>
  );
}

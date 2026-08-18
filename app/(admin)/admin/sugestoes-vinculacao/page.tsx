export const dynamic = "force-dynamic";

import { Bell } from "lucide-react";
import { fetchSugestoesPendentes } from "@/lib/actions/sugestoes-vinculacao";
import { SugestoesPageClient } from "@/components/admin/SugestoesVinculacaoPage";

export default async function SugestoesVinculacaoPage() {
  const { data: sugestoes } = await fetchSugestoesPendentes();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Sugestões de vinculação
          </h1>
          <p className="text-sm text-muted-foreground">
            Usinas identificadas automaticamente por similaridade de nome (trigrama) que precisam da sua confirmação.
          </p>
        </div>
      </div>

      <SugestoesPageClient sugestoes={sugestoes} />
    </div>
  );
}

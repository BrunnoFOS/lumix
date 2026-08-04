import { AlertTriangle } from "lucide-react";
import { getUsinasOffline } from "@/lib/actions/solis";

function formatSyncedAt(synced_at: string): string {
  const date = new Date(synced_at);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function UsinasOfflineBanner() {
  const offline = await getUsinasOffline();

  if (offline.length === 0) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-destructive">
            {offline.length === 1
              ? "1 usina offline"
              : `${offline.length} usinas offline`}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Todos os inversores destas usinas estao com status offline.
          </p>
          <ul className="mt-2 space-y-1">
            {offline.map((u) => (
              <li
                key={u.station_id}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <span className="font-medium text-foreground">
                  {u.station_name}
                </span>
                {u.uc_codigo && (
                  <span className="text-xs text-muted-foreground">
                    UC {u.uc_codigo}
                  </span>
                )}
                {u.empresa_nome && (
                  <span className="text-xs text-muted-foreground">
                    &middot; {u.empresa_nome}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  &middot; Sync {formatSyncedAt(u.synced_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

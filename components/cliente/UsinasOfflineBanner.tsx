import Link from "next/link";
import { AlertTriangle, WifiOff, ArrowRight } from "lucide-react";
import type { UsinaOfflineInfo } from "@/lib/actions/dados-geracao";

const MAX_VISIBLE = 3;

interface Props {
  usinas: UsinaOfflineInfo[];
}

export function UsinasOfflineBanner({ usinas }: Props) {
  if (usinas.length === 0) return null;

  const totalOffline = usinas.reduce((sum, u) => sum + u.inversores_offline, 0);
  const totalAlarme = usinas.reduce((sum, u) => sum + u.inversores_alarme, 0);
  const hasAlarme = totalAlarme > 0;

  const visible = usinas.slice(0, MAX_VISIBLE);
  const remaining = usinas.length - MAX_VISIBLE;

  return (
    <div className={`rounded-lg border px-4 py-3 ${
      hasAlarme
        ? "border-red-200 bg-red-50"
        : "border-amber-200 bg-amber-50"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-md p-1.5 ${hasAlarme ? "bg-red-100" : "bg-amber-100"}`}>
          {hasAlarme ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-600" />
          )}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${hasAlarme ? "text-red-800" : "text-amber-800"}`}>
            {hasAlarme && totalOffline > 0
              ? `${totalAlarme} inversor${totalAlarme > 1 ? "es" : ""} em alarme e ${totalOffline} offline`
              : hasAlarme
                ? `${totalAlarme} inversor${totalAlarme > 1 ? "es" : ""} em alarme`
                : `${totalOffline} inversor${totalOffline > 1 ? "es" : ""} offline`
            }
          </p>
          <div className="mt-1 space-y-0.5">
            {visible.map((u) => (
              <p key={u.uc_id} className={`text-xs ${hasAlarme ? "text-red-700" : "text-amber-700"}`}>
                UC {u.codigo_uc}
                {u.station_name ? ` (${u.station_name})` : ""}
                {" — "}
                {u.inversores_alarme > 0 && `${u.inversores_alarme} em alarme`}
                {u.inversores_alarme > 0 && u.inversores_offline > 0 && ", "}
                {u.inversores_offline > 0 && `${u.inversores_offline} offline`}
                {` de ${u.inversores_total}`}
              </p>
            ))}
          </div>
          {remaining > 0 && (
            <details className="mt-1">
              <summary className={`cursor-pointer text-xs font-medium ${hasAlarme ? "text-red-600 hover:text-red-700" : "text-amber-600 hover:text-amber-700"}`}>
                Ver +{remaining} {remaining === 1 ? "outra usina" : "outras usinas"}
              </summary>
              <div className="mt-0.5 space-y-0.5">
                {usinas.slice(MAX_VISIBLE).map((u) => (
                  <p key={u.uc_id} className={`text-xs ${hasAlarme ? "text-red-700" : "text-amber-700"}`}>
                    UC {u.codigo_uc}
                    {u.station_name ? ` (${u.station_name})` : ""}
                    {" — "}
                    {u.inversores_alarme > 0 && `${u.inversores_alarme} em alarme`}
                    {u.inversores_alarme > 0 && u.inversores_offline > 0 && ", "}
                    {u.inversores_offline > 0 && `${u.inversores_offline} offline`}
                    {` de ${u.inversores_total}`}
                  </p>
                ))}
              </div>
            </details>
          )}
          <Link
            href="/cliente/usina"
            className={`mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline ${
              hasAlarme ? "text-red-700" : "text-amber-700"
            }`}
          >
            Ver detalhes da usina
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

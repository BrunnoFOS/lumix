import { AlertaList } from "@/components/admin/AlertaList";

export default function AlertasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alarmes e notificações das usinas.
        </p>
      </div>

      <AlertaList />
    </div>
  );
}

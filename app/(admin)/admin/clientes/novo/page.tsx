import { ClienteForm } from "@/components/admin/ClienteForm";

export default async function NovoClientePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Novo cliente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre um novo cliente.
        </p>
      </div>
      <ClienteForm />
    </div>
  );
}

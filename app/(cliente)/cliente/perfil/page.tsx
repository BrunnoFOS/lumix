export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/profile";
import { getUCsCliente } from "@/lib/actions/dados-geracao";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCNPJ } from "@/lib/utils";
import { Building2, MapPin, Phone, Zap } from "lucide-react";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "\u2014"}</span>
    </div>
  );
}

export default async function PerfilPage() {
  const profile = await getCurrentProfile();

  if (!profile || !profile.empresa_id) {
    redirect("/login");
  }

  const supabase = await createServerClient();

  // Buscar empresa e UCs em paralelo
  const [{ data: empresa }, ucs] = await Promise.all([
    supabase
      .from("empresas")
      .select("nome, cnpj, endereco, cidade, estado, cep, telefone, email, responsavel")
      .eq("id", profile.empresa_id)
      .single(),
    getUCsCliente(profile.empresa_id),
  ]);

  if (!empresa) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados cadastrais da sua empresa
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Dados da empresa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Dados da empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Razao social" value={empresa.nome} />
            <InfoRow label="CNPJ" value={formatCNPJ(empresa.cnpj)} />
            <InfoRow label="Responsavel" value={empresa.responsavel} />
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-primary" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Telefone" value={empresa.telefone} />
            <InfoRow label="Email" value={empresa.email} />
          </CardContent>
        </Card>

        {/* Endereco */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Endereco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Endereco" value={empresa.endereco} />
            <InfoRow label="Cidade" value={empresa.cidade} />
            <InfoRow label="Estado" value={empresa.estado} />
            <InfoRow label="CEP" value={empresa.cep} />
          </CardContent>
        </Card>

        {/* UCs associadas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Unidades consumidoras
              <Badge variant="outline" className="ml-auto">
                {ucs.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ucs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma UC cadastrada</p>
            ) : (
              <div className="space-y-2">
                {ucs.map((uc) => (
                  <div
                    key={uc.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        UC {uc.codigo_uc}
                      </p>
                      <p className="text-xs text-muted-foreground">{uc.titular}</p>
                    </div>
                    <Badge variant="outline">{uc.potencia_instalada_kwp} kW</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

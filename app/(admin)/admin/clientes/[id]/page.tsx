import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Building2, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmpresaComRelacionamentos } from "@/lib/actions/empresas";
import { getUsuariosEmpresa } from "@/lib/actions/usuarios";
import { fetchSolisUCs, fetchSungrowUCs } from "@/lib/actions/solis";
import { UsuarioManager } from "@/components/admin/UsuarioManager";
import { ClienteUCSection } from "@/components/admin/ClienteUCSection";
import { formatCNPJ } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetalhesPage({ params }: Props) {
  const { id } = await params;
  const result = await getEmpresaComRelacionamentos(id);

  if (!result) notFound();

  const { ucs, grupoEmpresas, ...empresa } = result;
  const [usuarios, solisUCs, sungrowUCs] = await Promise.all([
    getUsuariosEmpresa(id),
    fetchSolisUCs(),
    fetchSungrowUCs(),
  ]);

  // Combinar usinas de ambos os provedores com tag de provider
  const stationIdsVinculados = new Set(
    ucs
      .filter((uc: { station_id: string | null }) => uc.station_id)
      .map((uc: { station_id: string | null }) => uc.station_id as string)
  );

  const todasUsinas = [
    ...solisUCs.data.map((u) => ({ ...u, provider: "solis" as const })),
    ...sungrowUCs.data.map((u) => ({ ...u, provider: "sungrow" as const })),
  ];

  const usinasDisponiveis = todasUsinas.filter(
    (s) => !stationIdsVinculados.has(s.station_id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LinkButton variant="ghost" size="icon" href="/admin/clientes">
            <ArrowLeft className="h-4 w-4" />
          </LinkButton>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{empresa.nome}</h1>
              <Badge variant={empresa.ativa ? "default" : "outline"}>
                {empresa.ativa ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {formatCNPJ(empresa.cnpj)}
            </p>
          </div>
        </div>
        <LinkButton href={`/admin/clientes/${id}/editar`}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </LinkButton>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Responsável</span>
              <span>{empresa.responsavel || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{empresa.email || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span>{empresa.telefone || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Endereço</span>
              <span>{empresa.endereco || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cidade/UF</span>
              <span>
                {empresa.cidade || empresa.estado
                  ? [empresa.cidade, empresa.estado].filter(Boolean).join("/")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CEP</span>
              <span>{empresa.cep || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empresas do mesmo grupo */}
      {grupoEmpresas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Mesmo grupo ({grupoEmpresas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupoEmpresas.map((e: { id: string; nome: string; cnpj: string; ativa: boolean }) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={`/admin/clientes/${e.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {e.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatCNPJ(e.cnpj)}</TableCell>
                    <TableCell>
                      <Badge variant={e.ativa ? "default" : "outline"}>
                        {e.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <UsuarioManager
        usuarios={usuarios}
        empresaId={id}
        empresaNome={empresa.nome}
      />

      <ClienteUCSection
        unidades={ucs}
        usinasDisponiveis={usinasDisponiveis}
        empresaId={id}
      />
    </div>
  );
}

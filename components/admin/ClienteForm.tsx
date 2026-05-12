"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { createEmpresa, updateEmpresa } from "@/lib/actions/empresas";
import { useCNPJLookup } from "@/hooks/use-cnpj-lookup";
import { useCEPLookup } from "@/hooks/use-cep-lookup";
import { useCidades } from "@/hooks/use-cidades";
import type { Empresa } from "@/types/database";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const selectClass =
  "flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface ClienteFormProps {
  empresa?: Empresa;
  grupos: { id: string; nome: string }[];
}

interface FormState {
  error?: string;
  data?: { id: string };
}

export function ClienteForm({ empresa, grupos }: ClienteFormProps) {
  const router = useRouter();
  const isEditing = !!empresa;
  const formRef = useRef<HTMLFormElement>(null);

  const empresaAny = empresa as Record<string, unknown> | undefined;

  const [nome, setNome] = useState(empresa?.nome ?? "");
  const [endereco, setEndereco] = useState(empresa?.endereco ?? "");
  const [cidade, setCidade] = useState(empresa?.cidade ?? "");
  const [estado, setEstado] = useState(empresa?.estado ?? "");
  const [cep, setCep] = useState(empresa?.cep ?? "");
  const [telefone, setTelefone] = useState(empresa?.telefone ?? "");
  const [email, setEmail] = useState(empresa?.email ?? "");
  const [grupoId, setGrupoId] = useState((empresaAny?.grupo_id as string) ?? "");

  const grupoNome = grupos.find((g) => g.id === grupoId)?.nome ?? "";

  const cnpjLookup = useCNPJLookup();
  const cepLookup = useCEPLookup();
  const { cidades, loading: cidadesLoading } = useCidades(estado);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState | null, formData: FormData): Promise<FormState> => {
      if (isEditing) {
        return await updateEmpresa(empresa.id, formData);
      }
      return await createEmpresa(formData);
    },
    null
  );

  useEffect(() => {
    if (state?.data?.id) {
      router.push(`/admin/clientes/${state.data.id}`);
    } else if (isEditing && state && !state.error) {
      router.push(`/admin/clientes/${empresa.id}`);
    }
  }, [state, router, isEditing, empresa?.id]);

  async function handleCNPJBlur(cnpj: string) {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) return;

    const data = await cnpjLookup.lookup(digits);
    if (!data) return;

    if (data.razao_social) setNome(data.razao_social);
    if (data.logradouro) setEndereco(data.logradouro);
    if (data.municipio) setCidade(data.municipio);
    if (data.uf) setEstado(data.uf);
    if (data.cep) setCep(data.cep);
    if (data.telefone) setTelefone(data.telefone);
    if (data.email) setEmail(data.email.toLowerCase());
  }

  async function handleCEPBlur(cepValue: string) {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;

    const data = await cepLookup.lookup(digits);
    if (!data) return;

    if (data.logradouro) setEndereco(data.logradouro);
    if (data.cidade) setCidade(data.cidade);
    if (data.estado) setEstado(data.estado);
  }

  return (
    <form action={formAction} ref={formRef}>
      {state?.error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <div className="relative">
                <Input
                  id="cnpj"
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  defaultValue={empresa?.cnpj}
                  required
                  onBlur={(e) => handleCNPJBlur(e.target.value)}
                />
                {cnpjLookup.loading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {cnpjLookup.error && (
                <p className="text-xs text-destructive">{cnpjLookup.error}</p>
              )}
              {!cnpjLookup.error && !isEditing && (
                <p className="text-xs text-muted-foreground">
                  Preencha o CNPJ para buscar dados automaticamente
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Grupo empresarial</Label>
              <input type="hidden" name="grupo_id" value={grupoId} />
              <Combobox
                options={grupos.map((g) => g.nome)}
                value={grupoNome}
                onChange={(nome) => {
                  const found = grupos.find((g) => g.nome === nome);
                  setGrupoId(found?.id ?? "");
                }}
                placeholder="Nenhum grupo (opcional)"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">Razão social *</Label>
              <Input
                id="nome"
                name="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input id="responsavel" name="responsavel" defaultValue={empresa?.responsavel ?? ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  name="cep"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={(e) => handleCEPBlur(e.target.value)}
                />
                {cepLookup.loading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {cepLookup.error && (
                <p className="text-xs text-destructive">{cepLookup.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <select
                name="estado"
                value={estado}
                onChange={(e) => { setEstado(e.target.value); setCidade(""); }}
                className={selectClass}
              >
                <option value="">UF</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              {cidades.length > 0 ? (
                <select
                  name="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecione a cidade</option>
                  {cidades.map((c) => (
                    <option key={c.nome} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id="cidade"
                  name="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder={cidadesLoading ? "Carregando cidades..." : "Selecione o estado primeiro"}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar cliente"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}

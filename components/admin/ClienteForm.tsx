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
import { formatCNPJ } from "@/lib/utils";
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
}

interface FormState {
  error?: string;
  data?: { id: string };
}

export function ClienteForm({ empresa }: ClienteFormProps) {
  const router = useRouter();
  const isEditing = !!empresa;
  const formRef = useRef<HTMLFormElement>(null);

  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? "");
  const [nome, setNome] = useState(empresa?.nome ?? "");
  const [endereco, setEndereco] = useState(empresa?.endereco ?? "");
  const [cidade, setCidade] = useState(empresa?.cidade ?? "");
  const [estado, setEstado] = useState(empresa?.estado ?? "");
  const [cep, setCep] = useState(empresa?.cep ?? "");
  const [telefone, setTelefone] = useState(empresa?.telefone ?? "");
  const [email, setEmail] = useState(empresa?.email ?? "");

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

  async function handleCNPJBlur(value: string) {
    const digits = value.replace(/\D/g, "");
    // Auto-formatar visualmente se tem 14 dígitos
    if (digits.length === 14) {
      setCnpj(formatCNPJ(digits));
    }

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
                  placeholder="CNPJ (apenas números)"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
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
              <Combobox
                name="estado"
                options={ESTADOS}
                value={estado}
                onChange={(v) => { setEstado(v); setCidade(""); }}
                placeholder="UF"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              {cidades.length > 0 ? (
                <Combobox
                  name="cidade"
                  options={cidades.map((c) => c.nome)}
                  value={cidade}
                  onChange={setCidade}
                  placeholder="Buscar cidade..."
                />
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

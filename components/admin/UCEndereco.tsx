"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { updateUCLocalizacao } from "@/lib/actions/unidades";
import { useCidadesGHI } from "@/hooks/use-cidades-ghi";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface Props {
  ucId: string;
  initial: {
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
  };
}

export function UCEndereco({ ucId, initial }: Props) {
  const router = useRouter();

  const [endereco, setEndereco] = useState(initial.endereco ?? "");
  const [cidade, setCidade] = useState(initial.cidade ?? "");
  const [estado, setEstado] = useState(initial.estado ?? "");

  const { cidades, loading: cidadesLoading } = useCidadesGHI(estado);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    endereco !== (initial.endereco ?? "") ||
    cidade !== (initial.cidade ?? "") ||
    estado !== (initial.estado ?? "");

  const isMissingLocation = !cidade || !estado;

  async function handleSave() {
    setSaving(true);
    setError(null);

    const result = await updateUCLocalizacao(ucId, {
      cidade,
      estado,
      endereco: endereco || null,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Endereço</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600">Salvo!</span>}
            <Button
              size="sm"
              disabled={!hasChanges || saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-2 h-3.5 w-3.5" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMissingLocation && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              Cidade e UF são obrigatórios para a geração de relatórios (irradiação GHI).
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              placeholder="Rua, número, bairro..."
              value={endereco}
              onChange={(e) => {
                setEndereco(e.target.value);
                setSaved(false);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">UF</Label>
            <Combobox
              options={ESTADOS}
              value={estado}
              onChange={(v) => {
                setEstado(v);
                setCidade("");
                setSaved(false);
              }}
              placeholder="UF"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Combobox
              options={cidades}
              value={cidade}
              onChange={(v) => {
                setCidade(v);
                setSaved(false);
              }}
              disabled={!estado || cidadesLoading}
              placeholder={
                !estado
                  ? "Selecione a UF primeiro"
                  : cidadesLoading
                    ? "Carregando cidades..."
                    : "Buscar cidade..."
              }
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

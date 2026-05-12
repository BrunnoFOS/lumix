"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Building2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createGrupo,
  updateGrupo,
  deleteGrupo,
  type GrupoComEmpresas,
} from "@/lib/actions/grupos";
import { formatCNPJ } from "@/lib/utils";

export function GrupoPageClient({ grupos }: { grupos: GrupoComEmpresas[] }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCriar() {
    if (!novoNome.trim()) return;
    setSaving(true);
    const result = await createGrupo(novoNome);
    setSaving(false);
    if (!result.error) {
      setNovoNome("");
      setCriando(false);
      router.refresh();
    }
  }

  async function handleEditar(id: string) {
    if (!editNome.trim()) return;
    setSaving(true);
    const result = await updateGrupo(id, editNome);
    setSaving(false);
    if (!result.error) {
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleDeletar(id: string) {
    setDeletingId(id);
    const result = await deleteGrupo(id);
    setDeletingId(null);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Botão criar */}
      {!criando ? (
        <div className="flex justify-end">
          <Button onClick={() => setCriando(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo grupo
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Input
              placeholder="Nome do grupo..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCriar()}
              autoFocus
              className="max-w-sm"
            />
            <Button size="sm" onClick={handleCriar} disabled={saving || !novoNome.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCriando(false); setNovoNome(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de grupos */}
      {grupos.length === 0 && !criando && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum grupo criado.
          </p>
        </div>
      )}

      {grupos.map((grupo) => (
        <Card key={grupo.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              {editingId === grupo.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEditar(grupo.id)}
                    autoFocus
                    className="h-8 max-w-xs"
                  />
                  <Button size="icon" className="h-8 w-8" onClick={() => handleEditar(grupo.id)} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{grupo.nome}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {grupo.empresas.length} empresa{grupo.empresas.length !== 1 && "s"}
                  </Badge>
                </div>
              )}
              {editingId !== grupo.id && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => { setEditingId(grupo.id); setEditNome(grupo.nome); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDeletar(grupo.id)}
                    disabled={deletingId === grupo.id}
                  >
                    {deletingId === grupo.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          {grupo.empresas.length > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {grupo.empresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{empresa.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCNPJ(empresa.cnpj)}
                      </span>
                    </div>
                    <Badge variant={empresa.ativa ? "default" : "outline"} className="text-[10px]">
                      {empresa.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useState, useCallback, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, KeyRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createUsuario,
  resetSenhaUsuario,
  deleteUsuario,
} from "@/lib/actions/usuarios";
import { formatDate } from "@/lib/utils";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  created_at: string;
}

interface FormState {
  error?: string;
  data?: { id: string };
}

const MAX_USUARIOS = 2;

export function UsuarioManager({
  usuarios,
  empresaId,
  empresaNome,
}: {
  usuarios: Usuario[];
  empresaId: string;
  empresaNome: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [resetingId, setResetingId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState | null, formData: FormData): Promise<FormState> => {
      formData.set("empresa_id", empresaId);
      return await createUsuario(formData);
    },
    null
  );

  useEffect(() => {
    if (state?.data?.id) {
      setShowForm(false);
      router.refresh();
    }
  }, [state, router]);

  const handleReset = useCallback(async () => {
    if (!resetingId || !novaSenha) return;
    const result = await resetSenhaUsuario(resetingId, novaSenha);
    if (result.error) {
      setResetMsg(result.error);
    } else {
      setResetMsg("Senha alterada com sucesso.");
      setNovaSenha("");
      setTimeout(() => {
        setResetingId(null);
        setResetMsg(null);
      }, 2000);
    }
  }, [resetingId, novaSenha]);

  const handleDelete = useCallback(
    async (userId: string) => {
      const result = await deleteUsuario(userId, empresaId);
      if (!result.error) {
        setDeleteConfirm(null);
        router.refresh();
      }
    },
    [empresaId, router]
  );

  const limiteAtingido = usuarios.length >= MAX_USUARIOS;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Usuários ({usuarios.length}/{MAX_USUARIOS})
          </CardTitle>
          {!showForm && !limiteAtingido && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo usuário
            </Button>
          )}
        </div>
        {limiteAtingido && !showForm && (
          <p className="text-sm text-muted-foreground">
            Limite de {MAX_USUARIOS} usuários por empresa atingido.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de criação */}
        {showForm && (
          <div className="rounded-lg border border-border p-4">
            <form action={formAction}>
              {state?.error && (
                <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {state.error}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" name="nome" required placeholder="Nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required placeholder="email@empresa.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha *</Label>
                  <Input id="senha" name="senha" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Criando..." : "Criar usuário"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de usuários */}
        {usuarios.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado para esta empresa.
          </div>
        ) : (
          <div className="space-y-3">
            {usuarios.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{user.nome}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.telefone && (
                    <p className="text-xs text-muted-foreground">{user.telefone}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(user.created_at)}
                  </span>

                  {/* Reset senha */}
                  {resetingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Nova senha"
                        className="h-8 w-36 text-sm"
                        minLength={6}
                      />
                      <Button size="sm" variant="default" onClick={handleReset} disabled={novaSenha.length < 6}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setResetingId(null); setResetMsg(null); }}>
                        X
                      </Button>
                      {resetMsg && (
                        <span className={`text-xs ${resetMsg.includes("sucesso") ? "text-emerald-600" : "text-red-600"}`}>
                          {resetMsg}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setResetingId(user.id); setNovaSenha(""); setResetMsg(null); }}
                      title="Alterar senha"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Excluir */}
                  {deleteConfirm === user.id ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                        Confirmar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        Não
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(user.id)}
                      title="Excluir usuário"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

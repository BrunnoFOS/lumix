"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getNotificacoesNaoLidas, marcarComoLida, marcarTodasComoLidas } from "@/lib/actions/notificacoes";
import { formatDateTime } from "@/lib/utils";

interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  fatura_id: string | null;
  created_at: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotificacoes() {
    setLoading(true);
    const data = await getNotificacoesNaoLidas();
    setNotificacoes(data);
    setLoading(false);
  }

  useEffect(() => {
    loadNotificacoes();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleNotificacaoClick(notificacao: Notificacao) {
    await marcarComoLida(notificacao.id);
    setNotificacoes((prev) => prev.filter((n) => n.id !== notificacao.id));

    if (notificacao.fatura_id) {
      router.push(`/admin/faturas/${notificacao.fatura_id}`);
    }
  }

  async function handleMarcarTodasLidas() {
    await marcarTodasComoLidas();
    setNotificacoes([]);
    router.refresh();
  }

  const count = notificacoes.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative"
        )}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
          >
            {count > 9 ? "9+" : count}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarcarTodasLidas}
              className="h-auto p-1 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : count === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação nova
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notificacoes.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificacaoClick(notif)}
                className="cursor-pointer flex-col items-start gap-1 px-4 py-3"
              >
                <p className="text-sm font-medium">{notif.mensagem}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(notif.created_at)}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

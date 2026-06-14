"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useSugestoesPendentes } from "@/hooks/use-sugestoes-pendentes";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { count, loading } = useSugestoesPendentes();

  return (
    <Link
      href="/admin/sugestoes-vinculacao"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        count > 0 && "text-foreground"
      )}
      aria-label={count > 0 ? `${count} usinas pendentes de confirmação` : "Sugestões de vinculação"}
      title={count > 0 ? `${count} usina${count !== 1 ? "s" : ""} pendente${count !== 1 ? "s" : ""} de confirmação` : "Nenhuma sugestão pendente"}
    >
      <Bell className={cn("h-5 w-5", count > 0 && "text-primary")} />
      {!loading && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white animate-in fade-in">
          {count >= 100 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Zap,
  FileText,
  Receipt,
  DollarSign,
  Bell,
  LogOut,
  Sun,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { logout } from "@/lib/actions/auth";
import { useAlertas } from "@/hooks/use-alertas";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Clientes", href: "/admin/clientes", icon: Building2 },
  { label: "Grupos", href: "/admin/grupos", icon: Users },
  { label: "Unidades", href: "/admin/unidades", icon: Zap },
  { label: "Relatórios", href: "/admin/relatorios", icon: FileText },
  { label: "Faturas", href: "/admin/faturas", icon: Receipt },
  { label: "Tarifas", href: "/admin/tarifas", icon: DollarSign },
  { label: "Alertas", href: "/admin/alertas", icon: Bell },
];

function AlertBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count >= 100 ? "99+" : String(count);
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold leading-none text-white">
      {display}
    </span>
  );
}

function SidebarContent({
  onNavigate,
  alertasAtivos,
}: {
  onNavigate?: () => void;
  alertasAtivos: number;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-6 py-5">
        <Sun className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-foreground">Lumix</span>
        <span className="ml-auto rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isAlertas = item.href === "/admin/alertas";
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-label={
                isAlertas && alertasAtivos > 0
                  ? `${alertasAtivos} alertas ativos`
                  : undefined
              }
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="relative">
                <item.icon className="h-4 w-4" />
                {isAlertas && alertasAtivos > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-red-600" />
                )}
              </span>
              {item.label}
              {isAlertas && <AlertBadge count={alertasAtivos} />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const { ativos } = useAlertas();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r border-border bg-white md:flex">
        <SidebarContent alertasAtivos={ativos} />
      </aside>

      {/* Mobile header + sheet */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-white px-4 py-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-9 w-9")}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <div className="flex h-full flex-col">
              <SidebarContent
                onNavigate={() => setOpen(false)}
                alertasAtivos={ativos}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Sun className="h-5 w-5 text-primary" />
        <span className="text-base font-bold text-foreground">Lumix</span>
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Admin
        </span>
      </div>
    </>
  );
}

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateSession } from "@/lib/supabase/middleware";

const publicRoutes = ["/login", "/signup", "/reset-password"];

async function getRole(userId: string): Promise<string | null> {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role ?? null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas: permitir acesso
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const { user, supabaseResponse } = await updateSession(request);

    // Se já logado, redirecionar para dashboard
    if (user) {
      const role = await getRole(user.id);
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname =
        role === "admin" ? "/admin/dashboard" : "/cliente/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }

    return supabaseResponse;
  }

  // Auth callback: permitir
  if (pathname.startsWith("/auth/callback")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // API cron: protegido por CRON_SECRET, não por auth
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  // Rotas protegidas: verificar autenticação
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Verificar role para rotas admin e cliente
  const role = await getRole(user.id);

  // Admin tentando acessar rotas de cliente ou vice-versa
  if (pathname.startsWith("/admin") && role !== "admin") {
    const clienteUrl = request.nextUrl.clone();
    clienteUrl.pathname = "/cliente/dashboard";
    return NextResponse.redirect(clienteUrl);
  }

  if (pathname.startsWith("/cliente") && role === "admin") {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin/dashboard";
    return NextResponse.redirect(adminUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

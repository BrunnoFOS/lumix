import { AdminSidebar } from "@/components/shared/sidebar";
import { NotificationBell } from "@/components/admin/NotificationBell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="hidden items-center justify-end border-b border-border bg-white px-6 py-2 md:flex">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

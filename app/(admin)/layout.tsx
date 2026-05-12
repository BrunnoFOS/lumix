import { AdminSidebar } from "@/components/shared/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}

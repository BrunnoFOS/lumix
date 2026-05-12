import { Sun } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="mb-8 flex items-center gap-2">
        <Sun className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold text-foreground">Lumix</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

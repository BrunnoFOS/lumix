import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground/40" />
      <h1 className="mt-6 text-2xl font-bold text-foreground">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        A página que você está procurando não existe ou foi removida.
      </p>
      <Link href="/" className="mt-6">
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  );
}

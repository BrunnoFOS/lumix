"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  pdfUrl: string;
  children: React.ReactNode;
}

export function FaturaProcessadaPDFLayout({ pdfUrl, children }: Props) {
  const [showPdf, setShowPdf] = useState(false);

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPdf(!showPdf)}
        >
          {showPdf ? (
            <>
              <EyeOff className="mr-2 h-3.5 w-3.5" />
              Ocultar fatura
            </>
          ) : (
            <>
              <Eye className="mr-2 h-3.5 w-3.5" />
              Visualizar fatura
            </>
          )}
        </Button>
      </div>

      {showPdf ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="sticky top-4 self-start">
            <iframe
              src={pdfUrl}
              className="h-[calc(100vh-6rem)] w-full rounded-lg border border-border"
              title="Fatura original"
            />
          </div>
          <div>{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

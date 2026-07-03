"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const GeracaoChart = dynamic(
  () => import("@/components/cliente/GeracaoChart").then((mod) => ({ default: mod.GeracaoChart })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Geracao vs Estimado (ultimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    ),
  }
);

export { GeracaoChart as GeracaoChartLazy };

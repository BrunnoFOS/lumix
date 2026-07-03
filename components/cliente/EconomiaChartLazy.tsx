"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const EconomiaChart = dynamic(
  () => import("@/components/cliente/EconomiaChart").then((mod) => ({ default: mod.EconomiaChart })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Economia Mensal (ultimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    ),
  }
);

export { EconomiaChart as EconomiaChartLazy };

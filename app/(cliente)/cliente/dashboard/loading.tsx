import { Skeleton } from "@/components/ui/skeleton";

export default function ClienteDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-white p-6 shadow-md">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-3 h-9 w-20" />
            <Skeleton className="mt-1 h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="rounded-lg border border-border p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>

      <div className="rounded-lg border border-border p-6">
        <Skeleton className="h-5 w-44 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

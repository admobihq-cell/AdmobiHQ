import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches driver-application-detail-view.tsx — header (back button, name,
 * submitted date, status badge), detail-rows card, document grid, and the
 * review action panel. */
export function DriverApplicationDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <div className="space-y-0 rounded-xl border bg-card p-4 shadow-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-0">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3.5 w-24" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 rounded-xl border bg-card p-4 shadow-none">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}

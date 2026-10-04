import { Skeleton } from "@workspace/ui/components/skeleton"

function CardShell({ children, flush = true }: { children: React.ReactNode; flush?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="px-4 py-4">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className={flush ? "divide-y border-t" : "border-t p-4"}>{children}</div>
    </div>
  )
}

/** Mirrors sos-detail-view.tsx — header, acknowledgement banner, then the
 * report/updates column beside driver, location and actions. */
export function SosDetailSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-5 w-24 rounded-4xl" />
      </div>

      <Skeleton className="h-12 w-full rounded-xl" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <CardShell flush={false}>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </CardShell>

          <CardShell flush={false}>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </CardShell>
        </div>

        <div className="flex flex-col gap-6">
          <CardShell flush={false}>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32 rounded-lg" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          </CardShell>

          <CardShell flush={false}>
            <div className="space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
          </CardShell>

          <CardShell flush={false}>
            <div className="space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  )
}

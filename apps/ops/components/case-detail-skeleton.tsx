import { Skeleton } from "@workspace/ui/components/skeleton"

function CardShell({ children, flush = true }: { children: React.ReactNode; flush?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="px-4 py-4">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className={flush ? "divide-y border-t" : "border-t p-4"}>{children}</div>
    </div>
  )
}

function DetailRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      ))}
    </>
  )
}

/** Mirrors case-detail-view.tsx — identity header, the conversation column and
 * the case/contact/timeline rail. */
export function CaseDetailSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-5 w-20 rounded-4xl" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="px-4 py-4">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-4 border-t p-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={i % 2 === 0 ? "flex gap-2.5" : "flex flex-row-reverse gap-2.5"}
              >
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className={i % 2 === 0 ? "h-14 w-3/5 rounded-2xl" : "h-10 w-2/5 rounded-2xl"} />
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t p-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <CardShell flush={false}>
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell>
            <DetailRows count={5} />
          </CardShell>

          <CardShell>
            <DetailRows count={3} />
          </CardShell>
        </div>
      </div>
    </div>
  )
}

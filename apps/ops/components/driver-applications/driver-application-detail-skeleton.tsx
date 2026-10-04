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
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      ))}
    </>
  )
}

/** Mirrors driver-application-detail-view.tsx — header, the four-fact strip,
 * then the documents/applicant column beside review, payout and timeline. */
export function DriverApplicationDetailSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <Skeleton className="h-5 w-20 rounded-4xl" />
      </div>

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <CardShell flush={false}>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-40 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell>
            <DetailRows count={5} />
          </CardShell>
        </div>

        <div className="flex flex-col gap-6">
          <CardShell flush={false}>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </CardShell>

          <CardShell>
            <DetailRows count={2} />
          </CardShell>

          <CardShell>
            <DetailRows count={4} />
          </CardShell>
        </div>
      </div>
    </div>
  )
}

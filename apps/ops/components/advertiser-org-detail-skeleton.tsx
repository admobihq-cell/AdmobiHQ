import { Skeleton } from "@workspace/ui/components/skeleton"

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-10 rounded-4xl" />
      </div>
      <div className="divide-y border-t">{children}</div>
    </div>
  )
}

/** Mirrors advertiser-org-detail-view.tsx — identity header, three stat tiles,
 * then the members/campaigns column beside invitations and activity. */
export function AdvertiserOrgDetailSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <CardShell>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-5 w-16 rounded-4xl" />
              </div>
            ))}
          </CardShell>

          <CardShell>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-5 w-20 rounded-4xl" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </CardShell>
        </div>

        <div className="flex flex-col gap-6">
          <CardShell>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-5 w-14 rounded-4xl" />
              </div>
            ))}
          </CardShell>

          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="px-4 py-4">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-5 border-t px-4 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-44" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

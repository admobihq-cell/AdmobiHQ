import { Skeleton } from "@workspace/ui/components/skeleton"

export default function CampaignCalendarLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="size-7 rounded-lg" />
        </div>
        <div className="hidden gap-1 sm:flex">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-xl bg-card p-2 ring-1 ring-foreground/10 md:p-3">
          <div className="grid grid-cols-7 gap-1 pb-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="mx-auto h-3 w-9" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md sm:h-24" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/** The month grid on its own — weekday header + 7×6 day cells. Sits inside the
 * FlightCalendar card while FullCalendar boots (it renders collapsed for a
 * frame otherwise), and inside the full page skeleton below. */
export function CalendarGridSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="grid grid-cols-7 gap-1 pb-0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="mx-auto h-3 w-9" />
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-full min-h-16 rounded-md sm:min-h-24" />
        ))}
      </div>
    </div>
  )
}

/** Full-page fallback for the route's `loading.tsx`. */
export function CampaignCalendarSkeleton() {
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
          <Skeleton className="h-7 w-14 rounded-lg" />
        </div>
        <div className="hidden gap-1 sm:flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-xl bg-card p-2 ring-1 ring-foreground/10 md:p-3">
          <CalendarGridSkeleton />
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

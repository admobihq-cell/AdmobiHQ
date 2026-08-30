import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/** Placeholder that mirrors NotificationFeed's real layout so the route
 * `loading.tsx` and the component's own loading state don't jump when data
 * lands. `chrome` draws the toolbar + filter bar; the feed itself renders those
 * for real while loading, so it passes `chrome={false}`. */
export function NotificationFeedSkeleton({
  rows = 6,
  chrome = true,
  className,
}: {
  rows?: number
  chrome?: boolean
  className?: string
}) {
  const widths = ["w-40", "w-56", "w-32", "w-48", "w-44", "w-52"]

  return (
    <div className={cn("flex flex-col", className)}>
      {chrome ? (
        <>
          <div className="flex items-center justify-between pb-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>
          <div className="flex gap-1.5 border-b pb-3">
            <Skeleton className="h-7 w-12 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </>
      ) : null}

      <Skeleton className="my-2 h-3 w-16" />

      <div className="divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex gap-3 py-3 pr-2 pl-4">
            <Skeleton className="mt-0.5 size-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className={cn("h-3.5", widths[index % widths.length])} />
                <Skeleton className="h-3 w-8 shrink-0" />
              </div>
              <Skeleton className="h-3 w-full max-w-xl" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

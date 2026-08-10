import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

type ActivityListSkeletonProps = {
  rows?: number
  /** "dot" matches the recent-activity feed; "icon" matches wallet-style transaction/spend lists. */
  leading?: "dot" | "icon"
}

/** Divided-row list — matches recent-activity, spend-by-campaign, and transaction lists. */
export function ActivityListSkeleton({
  rows = 4,
  leading = "dot",
}: ActivityListSkeletonProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            {i > 0 ? <Separator /> : null}
            <div className="flex items-center gap-4 p-4">
              {leading === "icon" ? (
                <Skeleton className="size-9 shrink-0 rounded-lg" />
              ) : (
                <Skeleton className="size-2.5 shrink-0 rounded-full" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-3.5 w-16 shrink-0" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

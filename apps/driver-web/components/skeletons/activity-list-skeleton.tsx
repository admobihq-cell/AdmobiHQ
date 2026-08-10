import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Divided-row list — matches the recent-activity feed and payout history. */
export function ActivityListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            {i > 0 ? <Separator /> : null}
            <div className="flex items-start gap-4 p-4">
              <Skeleton className="mt-1.5 size-2.5 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

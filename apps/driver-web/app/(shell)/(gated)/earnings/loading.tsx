import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { ActivityListSkeleton } from "@/components/skeletons/activity-list-skeleton"
import { StatCardGridSkeleton } from "@/components/skeletons/stat-card-grid-skeleton"

export default function EarningsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <StatCardGridSkeleton count={4} />

      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="flex items-end justify-between gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <Skeleton
                    className="w-full max-w-8 rounded-t-md"
                    style={{ height: `${30 + ((i * 17) % 70)}%` }}
                  />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <ActivityListSkeleton rows={2} />
      </div>
    </div>
  )
}

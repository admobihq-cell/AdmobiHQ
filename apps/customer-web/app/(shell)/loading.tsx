import { Skeleton } from "@workspace/ui/components/skeleton"

import { ActivityListSkeleton } from "@/components/skeletons/activity-list-skeleton"
import { StatCardGridSkeleton } from "@/components/skeletons/stat-card-grid-skeleton"

/** Shell root is the Overview page — this is its skeleton, and the fallback for any route without its own. */
export default function ShellLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <StatCardGridSkeleton count={4} />

      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11 w-40 rounded-lg" />
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <ActivityListSkeleton rows={4} />
      </div>
    </div>
  )
}

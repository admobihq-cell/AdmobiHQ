import { Skeleton } from "@workspace/ui/components/skeleton"

import { ActivityListSkeleton } from "@/components/skeletons/activity-list-skeleton"
import { ChatThreadSkeleton } from "@/components/skeletons/chat-thread-skeleton"
import { StatCardGridSkeleton } from "@/components/skeletons/stat-card-grid-skeleton"

export default function DeliveryTrackLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <StatCardGridSkeleton count={3} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <ChatThreadSkeleton />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <ActivityListSkeleton rows={6} leading="dot" />
        </div>
      </div>
    </div>
  )
}

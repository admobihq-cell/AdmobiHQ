import { NotificationFeedSkeleton } from "@workspace/ui/components/notification-feed-skeleton"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function NotificationsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <NotificationFeedSkeleton />
    </div>
  )
}

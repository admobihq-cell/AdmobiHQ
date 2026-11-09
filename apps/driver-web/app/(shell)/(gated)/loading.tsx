import { Skeleton } from "@workspace/ui/components/skeleton"

import { PayoutHeroSkeleton } from "@/components/overview/payout-hero"
import { ActivityListSkeleton } from "@/components/skeletons/activity-list-skeleton"

/** Shell root is the Dashboard page — this is its skeleton, and the fallback for any route without its own. */
export default function ShellLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10">
      <Skeleton className="h-9 w-72" />
      <PayoutHeroSkeleton />
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <ActivityListSkeleton rows={3} />
      </div>
    </div>
  )
}

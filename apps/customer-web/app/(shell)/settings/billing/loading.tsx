import { Skeleton } from "@workspace/ui/components/skeleton"

import { ActivityListSkeleton } from "@/components/skeletons/activity-list-skeleton"
import { WalletHeroSkeleton } from "@/components/skeletons/wallet-hero-skeleton"

export default function BillingLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <WalletHeroSkeleton />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <ActivityListSkeleton rows={3} leading="icon" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <ActivityListSkeleton rows={3} leading="icon" />
        </div>
      </div>
    </div>
  )
}

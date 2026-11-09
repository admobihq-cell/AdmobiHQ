import { Skeleton } from "@workspace/ui/components/skeleton"

import { PayoutHeroSkeleton } from "@/components/overview/payout-hero"

export default function EarningsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <PayoutHeroSkeleton />
      <div className="space-y-5">
        <Skeleton className="h-6 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="ml-8 h-10" />
        ))}
      </div>
    </div>
  )
}

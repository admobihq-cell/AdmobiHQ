import { Skeleton } from "@workspace/ui/components/skeleton"

import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton"

export default function CampaignsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      <CardGridSkeleton count={4} />
    </div>
  )
}

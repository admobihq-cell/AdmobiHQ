import { Skeleton } from "@workspace/ui/components/skeleton"

import { DetailRecordSkeleton } from "@/components/skeletons/detail-record-skeleton"
import { StatCardGridSkeleton } from "@/components/skeletons/stat-card-grid-skeleton"

export default function CampaignDetailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <StatCardGridSkeleton count={4} />

      <DetailRecordSkeleton fields={4} />
    </div>
  )
}

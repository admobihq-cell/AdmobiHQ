import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { SupportSkeleton } from "@/components/dashboards/dashboard-skeletons"

export default function SupportLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="support" actions={<RangeSkeleton />} />
      <SupportSkeleton safety />
    </div>
  )
}

/** The 7D / 30D / 90D / All control's footprint in the header. */
function RangeSkeleton() {
  return <Skeleton className="h-8 w-48 rounded-lg" />
}

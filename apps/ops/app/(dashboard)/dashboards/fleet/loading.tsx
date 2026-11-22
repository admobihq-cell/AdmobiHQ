import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { FleetSkeleton } from "@/components/dashboards/dashboard-skeletons"

export default function FleetLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="fleet" actions={<RangeSkeleton />} />
      <FleetSkeleton money />
    </div>
  )
}

/** The 7D / 30D / 90D / All control's footprint in the header. */
function RangeSkeleton() {
  return <Skeleton className="h-8 w-48 rounded-lg" />
}

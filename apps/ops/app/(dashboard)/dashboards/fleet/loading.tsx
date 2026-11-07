import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { FleetSkeleton } from "@/components/dashboards/dashboard-skeletons"

export default function FleetLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="fleet" />
      <ToolbarSkeleton />
      <FleetSkeleton money />
    </div>
  )
}

import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { FinanceSkeleton } from "@/components/dashboards/dashboard-skeletons"

export default function FinancesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="finances" />
      <ToolbarSkeleton tabs={5} />
      <FinanceSkeleton tab="overview" />
    </div>
  )
}

import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { SupportSkeleton } from "@/components/dashboards/dashboard-skeletons"

export default function SupportLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="support" />
      <ToolbarSkeleton />
      <SupportSkeleton safety />
    </div>
  )
}

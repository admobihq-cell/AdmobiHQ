import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { PipelineSkeleton } from "@/components/dashboards/dashboard-skeletons"

export default function CampaignsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="campaigns" />
      <ToolbarSkeleton tabs={3} />
      <PipelineSkeleton />
    </div>
  )
}

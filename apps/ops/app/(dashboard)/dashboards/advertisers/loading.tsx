import { DashboardHeader } from "@/components/dashboards/dashboard-header"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { AdvertisersSkeleton } from "@/components/dashboards/dashboard-skeletons"

export default function AdvertisersLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardHeader page="advertisers" />
      <ToolbarSkeleton />
      <AdvertisersSkeleton money />
    </div>
  )
}

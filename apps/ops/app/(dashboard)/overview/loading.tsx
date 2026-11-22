import { OverviewSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { WelcomeSkeleton } from "@/components/overview/overview-welcome"

export default function OverviewLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <WelcomeSkeleton />
      <OverviewSkeleton />
    </div>
  )
}

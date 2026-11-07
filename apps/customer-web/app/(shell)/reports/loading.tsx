import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { PageHeadingSkeleton, ReportsTabSkeleton } from "@/components/skeletons/dashboard-skeletons"

export default function ReportsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeadingSkeleton />
      <ToolbarSkeleton tabs={5} extras={2} />
      <ReportsTabSkeleton tab="overview" />
    </div>
  )
}

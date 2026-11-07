import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { BillingOverviewSkeleton, PageHeadingSkeleton } from "@/components/skeletons/dashboard-skeletons"

export default function BillingLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeadingSkeleton />
      <ToolbarSkeleton tabs={4} />
      <BillingOverviewSkeleton />
    </div>
  )
}

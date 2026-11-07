import { DASHBOARD_COPY } from "@/components/dashboards/dashboard-header"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { OverviewSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { PageHero } from "@/components/ui/page-hero"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function OverviewLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHero
        eyebrow="Dashboards"
        title={DASHBOARD_COPY.overview.title}
        description={DASHBOARD_COPY.overview.description}
      />
      <ToolbarSkeleton />
      <OverviewSkeleton />
      <div className="flex flex-wrap gap-2" aria-hidden>
        {[28, 24, 20, 22, 24].map((w, i) => (
          <Skeleton key={i} className="h-9" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
    </div>
  )
}

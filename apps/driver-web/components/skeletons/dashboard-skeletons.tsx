import {
  ChartSkeleton,
  HeroKpiSkeleton,
  KpiStripSkeleton,
  LedgerSkeleton,
  ListSkeleton,
  SkeletonShell,
  ToolbarSkeleton,
} from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Title, subtitle and the header buttons, as every driver dashboard opens. */
function HeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/** Mirrors DashboardView's grid so nothing jumps when it mounts. */
export function DashboardSkeleton() {
  return (
    <SkeletonShell label="Loading your dashboard" className="flex-1">
      <div className="flex flex-col gap-6">
        <HeaderSkeleton actions={2} />
        <ToolbarSkeleton extras={1} />
        <HeroKpiSkeleton cells={4} deltas />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ListSkeleton rows={3} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartSkeleton variant="bars" />
          <ChartSkeleton variant="heatmap" />
          <ListSkeleton rows={4} />
        </div>
      </div>
    </SkeletonShell>
  )
}

export function EarningsSkeleton() {
  return (
    <SkeletonShell label="Loading your earnings" className="flex-1">
      <div className="flex flex-col gap-6">
        <HeaderSkeleton />
        <KpiStripSkeleton cells={4} columns={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ListSkeleton rows={3} />
        </div>
        <LedgerSkeleton rows={4} columns={5} filters />
      </div>
    </SkeletonShell>
  )
}

export function DeliveriesSkeleton() {
  return (
    <SkeletonShell label="Loading deliveries" className="flex-1">
      <div className="flex flex-col gap-6">
        <HeaderSkeleton actions={0} />
        <KpiStripSkeleton cells={4} columns={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LedgerSkeleton rows={4} columns={4} />
          </div>
          <ListSkeleton rows={2} />
        </div>
      </div>
    </SkeletonShell>
  )
}

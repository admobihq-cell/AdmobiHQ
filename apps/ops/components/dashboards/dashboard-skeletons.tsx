import { Card, CardContent } from "@workspace/ui/components/card"
import {
  ChartSkeleton,
  FigureSkeleton,
  HeroKpiSkeleton,
  HeroSkeleton,
  KpiStripSkeleton,
  LedgerSkeleton,
  ListSkeleton,
  SkeletonShell,
} from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { Skeleton } from "@workspace/ui/components/skeleton"

/* Loading shapes for the ops dashboards, one per tab. Primitives live in @workspace/ui. */

/* ---- One per dashboard view. `money` / `safety` mirror what the real tab hides by permission. ---- */

export function PipelineSkeleton() {
  return (
    <SkeletonShell label="Loading pipeline">
      <HeroKpiSkeleton cells={4} deltas />
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton variant="bars" />
        <ChartSkeleton className="lg:col-span-2" />
      </div>
      <ListSkeleton />
    </SkeletonShell>
  )
}

export function DeliverySkeleton() {
  return (
    <SkeletonShell label="Loading delivery">
      <div className="grid gap-4 lg:grid-cols-3">
        <FigureSkeleton />
        <ChartSkeleton variant="bars" />
        <ChartSkeleton variant="bars" />
      </div>
      <LedgerSkeleton />
    </SkeletonShell>
  )
}

export function InventorySkeleton() {
  return (
    <SkeletonShell label="Loading inventory mix">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton variant="bars" />
        <ChartSkeleton variant="bars" />
      </div>
      <ChartSkeleton variant="heatmap" />
      <LedgerSkeleton />
    </SkeletonShell>
  )
}

export function FleetSkeleton({ money }: { money: boolean }) {
  return (
    <SkeletonShell label="Loading fleet">
      <HeroKpiSkeleton cells={money ? 5 : 4} />
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton variant="bars" />
        <ChartSkeleton variant="bars" />
        <ChartSkeleton />
      </div>
      {money ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton variant="bars" />
        </div>
      ) : null}
      <ListSkeleton rows={5} />
    </SkeletonShell>
  )
}

export function AdvertisersSkeleton({ money }: { money: boolean }) {
  return (
    <SkeletonShell label="Loading advertisers">
      <KpiStripSkeleton cells={money ? 6 : 3} />
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton className={money ? undefined : "lg:col-span-3"} />
        {money ? (
          <>
            <ChartSkeleton variant="bars" />
            <ChartSkeleton variant="bars" />
          </>
        ) : null}
      </div>
      <LedgerSkeleton columns={money ? 5 : 4} />
    </SkeletonShell>
  )
}

export function SupportSkeleton({ safety }: { safety: boolean }) {
  return (
    <SkeletonShell label="Loading support and safety">
      <HeroKpiSkeleton cells={safety ? 4 : 2} />
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton className="lg:col-span-2" />
        <ChartSkeleton variant="bars" />
      </div>
      {safety ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ListSkeleton rows={4} />
        </div>
      ) : null}
      <LedgerSkeleton />
    </SkeletonShell>
  )
}

export function OverviewSkeleton() {
  return (
    <SkeletonShell label="Loading overview">
      <HeroKpiSkeleton cells={5} />
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartSkeleton className="xl:col-span-2" />
        <ListSkeleton rows={4} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton variant="bars" />
        <ChartSkeleton variant="bars" />
        <ChartSkeleton variant="bars" />
      </div>
    </SkeletonShell>
  )
}

/** Finances tabs: overview, ledger, wallets, payouts, tools. */
export function FinanceSkeleton({ tab }: { tab: string }) {
  switch (tab) {
    case "ledger":
      return (
        <SkeletonShell label="Loading ledger">
          <LedgerSkeleton rows={8} columns={6} filters />
        </SkeletonShell>
      )
    case "wallets":
      return (
        <SkeletonShell label="Loading wallets">
          <LedgerSkeleton rows={8} columns={5} />
        </SkeletonShell>
      )
    case "payouts":
      return (
        <SkeletonShell label="Loading payouts">
          <div className="grid gap-4 lg:grid-cols-3">
            <FigureSkeleton />
            <ChartSkeleton className="lg:col-span-2" />
          </div>
          <LedgerSkeleton />
        </SkeletonShell>
      )
    case "tools":
      return (
        <SkeletonShell label="Loading tool costs">
          <KpiStripSkeleton cells={3} />
          <ChartSkeleton variant="bars" />
        </SkeletonShell>
      )
    default:
      return (
        <SkeletonShell label="Loading finances">
          <div className="grid gap-4 xl:grid-cols-3">
            <HeroSkeleton deltas />
            <div className="grid gap-4 xl:col-span-2">
              <KpiStripSkeleton cells={4} />
              <Card className="shadow-xs">
                <CardContent className="grid gap-1">
                  <Skeleton className="my-[3px] h-3.5 w-32" />
                  <Skeleton className="h-7 w-36" />
                  <Skeleton className="my-[2px] h-3 w-64 max-w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartSkeleton className="lg:col-span-2" />
            <FigureSkeleton />
          </div>
        </SkeletonShell>
      )
  }
}

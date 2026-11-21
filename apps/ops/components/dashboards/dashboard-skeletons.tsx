import { Card, CardContent } from "@workspace/ui/components/card"
import {
  ChartSkeleton,
  FigureSkeleton,
  HeroKpiSkeleton,
  KpiStripSkeleton,
  LedgerSkeleton,
  ListSkeleton,
  SkeletonShell,
  StatListSkeleton,
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
          <ChartSkeleton variant="columns" className="lg:col-span-2" />
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
      <ChartSkeleton variant="grid" />
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
            {/* Revenue card: headline + net margin, daily columns, two cost tiles. */}
            <Card className="shadow-xs xl:col-span-2">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <Skeleton className="my-[3px] h-3.5 w-20" />
                    <Skeleton className="h-9 w-48 sm:h-10" />
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="my-[2px] h-3 w-52" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <div className="flex h-44 items-end gap-2">
                  {[40, 62, 48, 70, 56, 78, 64, 84, 72, 58, 66, 50, 74, 60].map((h, i) => (
                    <div key={i} className="flex h-full flex-1 items-end rounded-md bg-muted/40">
                      <Skeleton className="w-full rounded-md" style={{ height: `${h}%` }} />
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex gap-3 rounded-lg bg-muted/50 p-3">
                      <Skeleton className="size-8 shrink-0 rounded-md" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-3 w-36 max-w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <StatListSkeleton rows={3} />
          </div>
          <ChartSkeleton variant="sankey" />
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

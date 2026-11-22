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
  ToolbarSkeleton,
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
    case "attention":
      // DashboardCard of divided rows: label + detail on the left, amount on the right.
      return (
        <SkeletonShell label="Loading payments that need attention">
          <Card className="shadow-xs">
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="my-[3px] h-4 w-32" />
                <Skeleton className="my-[3px] h-3.5 w-96 max-w-full" />
              </div>
              <div className="divide-y">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-2">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-48 max-w-full" />
                      <Skeleton className="h-3.5 w-72 max-w-full" />
                    </div>
                    <Skeleton className="h-4 w-20 shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </SkeletonShell>
      )
    case "ledger":
      return (
        <SkeletonShell label="Loading ledger">
          <LedgerSkeleton rows={8} columns={6} summary={4} tabs={6} actions={2} />
        </SkeletonShell>
      )
    case "documents":
      return <BillingDocumentsSkeleton />
    case "wallets":
      return (
        <SkeletonShell label="Loading wallets">
          <LedgerSkeleton rows={8} columns={7} summary={4} tabs={4} />
        </SkeletonShell>
      )
    case "payouts":
      return (
        <SkeletonShell label="Loading payouts">
          <Skeleton className="ml-auto h-9 w-36" />
          <div className="grid gap-4 lg:grid-cols-3">
            <FigureSkeleton />
            <ChartSkeleton className="lg:col-span-2" />
          </div>
          <LedgerSkeleton rows={8} columns={8} tabs={6} />
        </SkeletonShell>
      )
    case "paystack":
      return (
        <SkeletonShell label="Loading Paystack">
          <KpiStripSkeleton cells={4} />
          <ToolbarSkeleton tabs={5} range={false} extras={2} />
          <LedgerSkeleton rows={8} columns={7} tabs={4} search />
        </SkeletonShell>
      )
    case "tools":
      return (
        <SkeletonShell label="Loading tool costs">
          <KpiStripSkeleton cells={3} />
          <ChartSkeleton variant="bars" />
          <Skeleton className="h-14 w-full rounded-lg" />
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

/** Invoices & quotes tab: the LedgerCard with its summary tiles, filter tabs + search, and table. */
export function BillingDocumentsSkeleton() {
  return (
    <SkeletonShell label="Loading invoices and quotes">
      <LedgerSkeleton rows={8} columns={8} summary={3} tabs={5} search actions={1} />
    </SkeletonShell>
  )
}

/** Quote/invoice editor: header with actions, the sectioned form, and the A4 preview panel. */
export function BillingEditorSkeleton() {
  const fields = (count: number) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
  const section = (title: string, body: React.ReactNode) => (
    <div key={title} className="flex flex-col gap-4 border-b pb-8 last:border-b-0">
      <Skeleton className="h-4 w-32" />
      {body}
    </div>
  )
  return (
    <SkeletonShell label="Loading document" className="gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,560px)_1fr]">
        <div className="flex flex-col gap-8">
          {section("details", fields(4))}
          {section("customer", fields(6))}
          {section(
            "lines",
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-28" />
            </div>
          )}
          {section("totals", fields(4))}
        </div>
        <div className="rounded-2xl bg-muted/60 p-4 sm:p-6">
          <Skeleton className="mb-3 h-3 w-20" />
          <div className="mx-auto aspect-[1/1.414] w-full max-w-[720px] rounded-sm bg-background p-[8%] shadow-xs">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="mt-[10%] h-3 w-1/3" />
            <Skeleton className="mt-2 h-3 w-1/4" />
            <Skeleton className="mt-[10%] h-24 w-full" />
            <Skeleton className="mt-4 ml-auto h-12 w-1/3" />
          </div>
        </div>
      </div>
    </SkeletonShell>
  )
}

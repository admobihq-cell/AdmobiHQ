import { Card, CardContent } from "@workspace/ui/components/card"
import {
  ChartSkeleton,
  FigureSkeleton,
  HeroKpiSkeleton,
  KpiStripSkeleton,
  LedgerSkeleton,
  ListSkeleton,
  SkeletonShell,
  ToolbarSkeleton,
} from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { Skeleton } from "@workspace/ui/components/skeleton"

/*
 * Loading shapes for the customer dashboards (Overview, Billing, Reports, a campaign report).
 * Each mirrors its tab's real card grid; change a tab's layout and its skeleton together.
 */

/** Page title block while the real heading is not on screen yet (route-level loading). */
export function PageHeadingSkeleton({ back = false }: { back?: boolean }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {back ? <Skeleton className="my-[2px] h-3.5 w-16" /> : <Skeleton className="my-[2px] h-3 w-20" />}
      <Skeleton className="my-[3px] h-8 w-64 max-w-full" />
      <Skeleton className="my-[3px] h-3.5 w-full max-w-md" />
    </div>
  )
}

/* ---- Billing ---- */

export function BillingOverviewSkeleton() {
  return (
    <SkeletonShell label="Loading your finances">
      <div className="grid gap-4 lg:grid-cols-2">
        <KpiStripSkeleton cells={4} columns={2} className="self-start" />
        <ChartSkeleton variant="bars" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ListSkeleton className="lg:col-span-2" rows={3} />
        <ListSkeleton rows={3} />
      </div>
    </SkeletonShell>
  )
}

export function BillingTabSkeleton({ tab }: { tab: string }) {
  if (tab === "transactions") return <LedgerSkeletonShell label="Loading transactions" columns={6} filters />
  if (tab === "invoices") return <LedgerSkeletonShell label="Loading invoices" columns={5} />
  if (tab === "statements") return <LedgerSkeletonShell label="Loading statements" columns={4} />
  return <BillingOverviewSkeleton />
}

export function LedgerSkeletonShell({ label, columns, filters }: { label: string; columns: number; filters?: boolean }) {
  return (
    <SkeletonShell label={label}>
      <LedgerSkeleton rows={8} columns={columns} filters={filters} />
    </SkeletonShell>
  )
}

/* ---- Reports ---- */

export function ReportsTabSkeleton({ tab }: { tab: string }) {
  switch (tab) {
    case "delivery":
      return (
        <SkeletonShell label="Loading delivery report">
          <KpiStripSkeleton cells={3} />
          <div className="grid gap-4 xl:grid-cols-3">
            <ChartSkeleton className="xl:col-span-2" />
            <FigureSkeleton />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton variant="bars" />
            <ChartSkeleton variant="bars" />
          </div>
          <LedgerSkeleton />
          <LedgerSkeleton rows={8} />
        </SkeletonShell>
      )
    case "audience":
      return (
        <SkeletonShell label="Loading audience report">
          <ChartSkeleton variant="heatmap" />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton variant="bars" />
            <ChartSkeleton variant="bars" />
          </div>
          <ChartSkeleton variant="heatmap" />
          <div className="grid gap-4 lg:grid-cols-2">
            <FigureSkeleton />
            <ListSkeleton rows={3} />
          </div>
        </SkeletonShell>
      )
    case "spend":
      return (
        <SkeletonShell label="Loading spend report">
          <KpiStripSkeleton cells={4} />
          <ChartSkeleton />
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartSkeleton variant="bars" />
            <ChartSkeleton variant="bars" />
            <ChartSkeleton variant="bars" />
          </div>
          <LedgerSkeleton />
        </SkeletonShell>
      )
    case "campaigns":
      return <LedgerSkeletonShell label="Loading campaigns" columns={6} filters />
    default:
      return (
        <SkeletonShell label="Loading report overview">
          <HeroKpiSkeleton cells={4} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton />
            <ListSkeleton rows={3} />
          </div>
          <LedgerSkeleton />
        </SkeletonShell>
      )
  }
}

/* ---- One campaign's report ---- */

/** The map is a real block of pixels, so it keeps a block, but inside a titled card. */
export function MapCardSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading map</span>
      <Card className="shadow-xs" aria-hidden>
        <div className="grid gap-1 px-4">
          <Skeleton className="my-[3px] h-4 w-32" />
          <Skeleton className="my-[3px] h-3.5 w-56 max-w-full" />
        </div>
        <CardContent>
          <Skeleton className="h-72 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  )
}

export function CampaignReportBodySkeleton() {
  return (
    <SkeletonShell label="Loading campaign report">
      <Card size="sm" className="gap-3 shadow-xs">
        <div className="flex items-start justify-between gap-2 px-(--card-spacing)">
          <div className="grid gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="px-(--card-spacing)">
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
        <div className="flex justify-between gap-2 px-(--card-spacing)">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
      </Card>
      <KpiStripSkeleton cells={6} columns={3} />
      <ChartSkeleton />
      <ChartSkeleton variant="heatmap" />
      <MapCardSkeleton />
      <LedgerSkeleton />
    </SkeletonShell>
  )
}

/* ---- Overview ---- */

/** KPI strip while campaigns load. */
export function OverviewKpiSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading your campaigns</span>
      <div aria-hidden>
        <KpiStripSkeleton cells={5} />
      </div>
    </div>
  )
}

/** The spend/delivery chart slot (two thirds wide) while the reports load. */
export function OverviewChartSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading spend and delivery</span>
      <div aria-hidden>
        <ChartSkeleton />
      </div>
    </div>
  )
}

/** Campaign cards while the list loads. */
export function ActiveCampaignsSkeleton() {
  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">Loading campaigns</span>
      {[0, 1, 2].map((i) => (
        <Card key={i} size="sm" className="gap-3 shadow-xs" aria-hidden>
          <div className="grid gap-1.5 px-(--card-spacing)">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="px-(--card-spacing)">
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="flex justify-between px-(--card-spacing)">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Whole Overview page, for the route loading and the search-params boundary. */
export function OverviewPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeadingSkeleton />
        <Skeleton className="h-10 w-36 rounded-lg" aria-hidden />
      </div>
      <ToolbarSkeleton />
      <OverviewKpiSkeleton />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <OverviewChartSkeleton />
        </div>
        <ListSkeleton rows={3} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" aria-hidden />
        <ActiveCampaignsSkeleton />
      </div>
    </div>
  )
}

/** A campaign report's whole page: back link, title, actions, range, then the body. */
export function CampaignReportPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeadingSkeleton back />
        <div className="flex gap-2" aria-hidden>
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>
      </div>
      <ToolbarSkeleton extras={1} />
      <CampaignReportBodySkeleton />
    </div>
  )
}

"use client"

import { useState } from "react"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Card, CardContent } from "@workspace/ui/components/card"
import { DashboardTabs } from "@workspace/ui/components/dashboard/dashboard-tabs"
import { DashboardToolbar } from "@workspace/ui/components/dashboard/dashboard-toolbar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { HowWeEstimateSheet } from "@/components/reports/how-we-estimate-sheet"
import { MeasurementBadge } from "@/components/reports/measurement-badge"
import { ReportsOverviewTab } from "@/components/reports/overview-tab"
import {
  REPORT_FILTER_KEYS,
  ReportFilterFields,
  showingText,
} from "@/components/reports/report-filters"
import { useReportOverview } from "@/lib/use-analytics"
import { useCampaigns } from "@/lib/use-campaigns"
import { useDashboardParams } from "@/lib/use-dashboard-params"
import { useOrgPermissions } from "@/lib/use-org"

const TABS = [{ value: "overview", label: "Overview" }]

function ReportsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full xl:col-span-2" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}

/**
 * Reports. Tab, range and filters live in the URL. Without `reports:read` it shows a plain
 * access message and makes no request. Money is hidden by the API, not just here.
 */
export function ReportsView() {
  const { can, isLoading: orgLoading } = useOrgPermissions()
  const canRead = can("reports:read")
  const canSeeMoney = can("billing:read")
  const { tab, setTab, range, filters, setRange, setFilter, clearFilters } = useDashboardParams(
    "overview",
    REPORT_FILTER_KEYS
  )
  const [explainOpen, setExplainOpen] = useState(false)
  const campaigns = useCampaigns().data ?? []

  // The overview query also supplies the measurement badge for every tab: same range and filters.
  const overview = useReportOverview(range, filters, { enabled: canRead })
  const activeTab = TABS.some((t) => t.value === tab) ? tab : "overview"
  const level = overview.data?.measurementLevel ?? "booked"

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          How your campaigns are delivering, who they reach and what they cost.
        </p>
      </div>

      {orgLoading ? (
        <ReportsSkeleton />
      ) : !canRead ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ask your account owner for report access.
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardToolbar
            range={range}
            onRangeChange={setRange}
            filters={{
              count: Object.keys(filters).length,
              content: <ReportFilterFields filters={filters} onChange={setFilter} />,
              onClear: clearFilters,
            }}
            showing={showingText(filters, (id) => campaigns.find((c) => String(c.id) === id)?.name)}
            badge={<MeasurementBadge level={level} onClick={() => setExplainOpen(true)} />}
          />
          <DashboardTabs tabs={TABS} value={activeTab} onChange={setTab} />

          {overview.isError ? (
            <ApiErrorBanner
              message={overview.error instanceof Error ? overview.error.message : "Could not load your reports."}
              onRetry={() => void overview.refetch()}
            />
          ) : !overview.data ? (
            <ReportsSkeleton />
          ) : (
            <ReportsOverviewTab report={overview.data} canSeeMoney={canSeeMoney} />
          )}
        </>
      )}

      <HowWeEstimateSheet open={explainOpen} onOpenChange={setExplainOpen} level={level} />
    </div>
  )
}

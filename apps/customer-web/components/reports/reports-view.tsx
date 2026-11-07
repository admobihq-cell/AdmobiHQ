"use client"

import { useState } from "react"
import { exportFileName } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Card, CardContent } from "@workspace/ui/components/card"
import { DashboardTabs } from "@workspace/ui/components/dashboard/dashboard-tabs"
import { DashboardToolbar } from "@workspace/ui/components/dashboard/dashboard-toolbar"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { ReportsTabSkeleton } from "@/components/skeletons/dashboard-skeletons"
import { AudienceTab } from "@/components/reports/audience-tab"
import { CampaignsTab } from "@/components/reports/campaigns-tab"
import { DeliveryTab } from "@/components/reports/delivery-tab"
import { HowWeEstimateSheet } from "@/components/reports/how-we-estimate-sheet"
import { MeasurementBadge } from "@/components/reports/measurement-badge"
import { ReportsOverviewTab } from "@/components/reports/overview-tab"
import {
  REPORT_FILTER_KEYS,
  ReportFilterFields,
  showingText,
} from "@/components/reports/report-filters"
import { SpendTab } from "@/components/reports/spend-tab"
import { reportPath } from "@/lib/analytics-client"
import {
  useReportAudience,
  useReportCampaigns,
  useReportDelivery,
  useReportOverview,
  useReportSpend,
} from "@/lib/use-analytics"
import { useCampaigns, useDownloadPdf } from "@/lib/use-campaigns"
import { useDashboardParams } from "@/lib/use-dashboard-params"
import { useOrgPermissions } from "@/lib/use-org"

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "delivery", label: "Delivery" },
  { value: "audience", label: "Audience" },
  { value: "spend", label: "Spend" },
  { value: "campaigns", label: "Campaigns" },
]

/**
 * Reports. Tab, range and filters live in the URL. Without `reports:read` it shows a plain
 * access message and makes no request. Money is hidden by the API, not just here. Only the
 * open tab's query runs, and the Spend query never runs without `billing:read`.
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
  const campaignList = useCampaigns().data ?? []
  const download = useDownloadPdf()

  const activeTab = TABS.some((t) => t.value === tab) ? tab : "overview"
  const on = (name: string, extra = true) => canRead && activeTab === name && extra

  // The overview query also supplies the measurement badge for every tab: same range and filters.
  const overview = useReportOverview(range, filters, { enabled: canRead })
  const delivery = useReportDelivery(range, filters, { enabled: on("delivery") })
  const audience = useReportAudience(range, filters, { enabled: on("audience") })
  const spend = useReportSpend(range, filters, { enabled: on("spend", canSeeMoney) })
  const campaigns = useReportCampaigns(range, filters, { enabled: on("campaigns") })

  const level = overview.data?.measurementLevel ?? "booked"
  const queries = { overview, delivery, audience, spend, campaigns }
  const open = queries[activeTab as keyof typeof queries]
  const exportRoute = activeTab === "delivery" ? "delivery" : activeTab === "campaigns" ? "campaigns" : null

  function body() {
    if (activeTab === "spend" && !canSeeMoney) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ask your account owner for billing access.
          </CardContent>
        </Card>
      )
    }
    if (open.isError) {
      return (
        <ApiErrorBanner
          message={open.error instanceof Error ? open.error.message : "Could not load your reports."}
          onRetry={() => void open.refetch()}
        />
      )
    }
    if (activeTab === "delivery" && delivery.data) return <DeliveryTab report={delivery.data} />
    if (activeTab === "audience" && audience.data) return <AudienceTab report={audience.data} />
    if (activeTab === "spend" && spend.data) return <SpendTab report={spend.data} />
    if (activeTab === "campaigns" && campaigns.data)
      return <CampaignsTab rows={campaigns.data.items} canSeeMoney={canSeeMoney} />
    if (activeTab === "overview" && overview.data)
      return <ReportsOverviewTab report={overview.data} canSeeMoney={canSeeMoney} />
    return <ReportsTabSkeleton tab={activeTab} />
  }

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
        <>
          <ToolbarSkeleton tabs={TABS.length} extras={2} />
          <ReportsTabSkeleton tab={activeTab} />
        </>
      ) : !canRead ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ask your account owner for report access.
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardToolbar
            view={<DashboardTabs tabs={TABS} value={activeTab} onChange={setTab} />}
            range={range}
            onRangeChange={setRange}
            filters={{
              count: Object.keys(filters).length,
              content: <ReportFilterFields filters={filters} onChange={setFilter} />,
              onClear: clearFilters,
            }}
            showing={showingText(filters, (id) => campaignList.find((c) => String(c.id) === id)?.name)}
            badge={<MeasurementBadge level={level} onClick={() => setExplainOpen(true)} />}
            onExport={
              exportRoute
                ? () =>
                    download.mutate({
                      path: reportPath(exportRoute, range, filters, true),
                      filename: exportFileName(exportRoute === "delivery" ? "delivery log" : "campaign report", null, "csv"),
                    })
                : undefined
            }
          />
          {body()}
        </>
      )}

      <HowWeEstimateSheet open={explainOpen} onOpenChange={setExplainOpen} level={level} />
    </div>
  )
}

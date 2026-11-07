"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { notFound } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, FileDown } from "lucide-react"
import {
  DAYPARTS,
  DAYPART_LABELS,
  REPORT_MARKETS,
  exportFileName,
  formatCompact,
  formatKes,
  formatLabel,
  type CampaignReportDto,
  type ReportOverviewDto,
} from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { Heatmap } from "@workspace/ui/components/charts/heatmap"
import { SegmentGauge } from "@workspace/ui/components/charts/segment-gauge"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { DashboardToolbar } from "@workspace/ui/components/dashboard/dashboard-toolbar"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard } from "@workspace/ui/components/dashboard/ledger-card"
import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { ProgressCard } from "@workspace/ui/components/dashboard/progress-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { DeliveryPacingCard } from "@/components/reports/delivery-pacing-card"
import { CREATIVE_COLUMNS, LOG_COLUMNS } from "@/components/reports/delivery-tab"
import { HowWeEstimateSheet } from "@/components/reports/how-we-estimate-sheet"
import { MeasurementBadge } from "@/components/reports/measurement-badge"
import {
  HEALTH_LABEL,
  HEALTH_TONE,
  NO_DELIVERY_MESSAGE,
  PHASE_LABEL,
  compactOrDash,
  percentOrDash,
  rangeText,
} from "@/components/reports/format"
import { reportPath } from "@/lib/analytics-client"
import { useCampaignReport } from "@/lib/use-analytics"
import { useDownloadPdf } from "@/lib/use-campaigns"
import { useDashboardParams } from "@/lib/use-dashboard-params"
import { useOrgPermissions } from "@/lib/use-org"

const MarketMapCard = dynamic(() => import("@/components/reports/market-map-card"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
})

const DAYPART_COLUMNS = DAYPARTS.map((d) => DAYPART_LABELS[d])
const LOG_PAGE_SIZE = 15

/** The pacing card takes the overview's shape; a campaign report has the same numbers per day. */
function pacingOf(report: CampaignReportDto): ReportOverviewDto["pacing"] {
  const scheduled = report.pacing.reduce((sum, d) => sum + Number(d.scheduled ?? 0), 0)
  const delivered = report.pacing.reduce((sum, d) => sum + Number(d.delivered ?? 0), 0)
  return {
    delivered,
    remaining: Math.max(0, scheduled - delivered),
    rate: scheduled > 0 ? delivered / scheduled : null,
    days: report.pacing,
  }
}

function ReportSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  )
}

/** One campaign's full report: the page an advertiser forwards. Another org's id is a 404. */
export function CampaignReportView({ id }: { id: number }) {
  const { can, isLoading: orgLoading } = useOrgPermissions()
  const canRead = can("reports:read")
  // A campaign report covers the whole flight by default.
  const { range, setRange } = useDashboardParams("report", [], "all")
  const [explainOpen, setExplainOpen] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const query = useCampaignReport(id, range, { enabled: canRead })
  const download = useDownloadPdf()

  if ((query.error as { status?: number } | null)?.status === 404) notFound()

  const report = query.data

  if (orgLoading) return <ReportSkeleton />
  if (!canRead) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Ask your account owner for report access.
        </CardContent>
      </Card>
    )
  }

  const heatCells = report?.marketByDaypart.map((c) => ({ row: c.x, column: c.y, value: c.value })) ?? []
  const hasEstimate = heatCells.some((c) => c.value !== null)
  const log = (report?.dailyLog ?? [])
    .filter((d) => Number(d.scheduled) > 0 || Number(d.delivered) > 0)
    .reverse()
  const logPages = Math.max(1, Math.ceil(log.length / LOG_PAGE_SIZE))
  const logCurrent = Math.min(logPage, logPages)
  const c = report?.campaign

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/reports?tab=campaigns" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden />
            Reports
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{c?.name ?? "Campaign report"}</h1>
          {c ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <StatusPill tone={HEALTH_TONE[c.health.level]}>{HEALTH_LABEL[c.health.level]}</StatusPill>
              <span>{c.phase ? PHASE_LABEL[c.phase] : c.status}</span>
              <span>{c.startsOn && c.endsOn ? `${c.startsOn} to ${c.endsOn}` : "Not scheduled"}</span>
              <span>{formatLabel(c.format)}</span>
              {c.market ? <span>{c.market}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!report}
            loading={download.isPending}
            onClick={() =>
              download.mutate({
                path: reportPath(`campaigns/${id}/pdf`, range),
                filename: exportFileName("campaign report", c?.name, "pdf"),
              })
            }
          >
            <FileDown aria-hidden />
            Download report (PDF)
          </Button>
          {c && c.status === "approved" && c.startsOn && c.endsOn ? (
            <Button
              variant="outline"
              size="sm"
              loading={download.isPending}
              onClick={() =>
                download.mutate({
                  path: `/v1/customer/campaigns/${id}/proof-of-play`,
                  filename: exportFileName("proof of play", c.name, "pdf"),
                })
              }
            >
              <FileDown aria-hidden />
              Proof of play (PDF)
            </Button>
          ) : null}
        </div>
      </div>

      <DashboardToolbar
        range={range}
        onRangeChange={setRange}
        badge={<MeasurementBadge level={report?.measurementLevel ?? "booked"} onClick={() => setExplainOpen(true)} />}
      />

      {query.isError ? (
        <ApiErrorBanner
          message={query.error instanceof Error ? query.error.message : "Could not load this report."}
          onRetry={() => void query.refetch()}
        />
      ) : !report || !c ? (
        <ReportSkeleton />
      ) : (
        <>
          <ProgressCard
            title="Flight progress"
            subtitle={c.health.reason}
            status={<StatusPill tone={HEALTH_TONE[c.health.level]}>{HEALTH_LABEL[c.health.level]}</StatusPill>}
            percent={(report.flightElapsed ?? 0) * 100}
            footer={
              <>
                <span>Elapsed {percentOrDash(report.flightElapsed)}</span>
                <span>Delivered {percentOrDash(report.kpis.deliveryRate)} of schedule</span>
              </>
            }
          />

          <KpiStrip
            columns={3}
            items={[
              {
                label: "Est. impressions",
                value: compactOrDash(report.kpis.impressions.likely),
                note: rangeText(report.kpis.impressions.low, report.kpis.impressions.high) ?? "No audience estimate yet",
              },
              {
                label: "Est. reach",
                value: report.kpis.reach ? compactOrDash(report.kpis.reach.likely) : "—",
                note: report.kpis.reach
                  ? rangeText(report.kpis.reach.low, report.kpis.reach.high) ?? "People reached, once each"
                  : "Appears once reach is estimated",
              },
              {
                label: "Frequency",
                value: report.kpis.frequency === null ? "—" : `${report.kpis.frequency.toFixed(1)}×`,
                note: "Views per person",
              },
              { label: "Plays delivered", value: report.kpis.playsDelivered.toLocaleString("en-KE"), note: "In the selected period" },
              { label: "Delivery rate", value: percentOrDash(report.kpis.deliveryRate), note: "Delivered ÷ scheduled" },
              ...(report.kpis.costPerThousandKes !== null
                ? [{ label: "Cost per 1,000", value: formatKes(report.kpis.costPerThousandKes), note: "Per 1,000 est. impressions" }]
                : []),
            ]}
          />

          <DeliveryPacingCard pacing={pacingOf(report)} hasRows={report.hasDeliveryRows} />

          <ChartCard
            title="Market × time of day"
            description="Est. impressions. Darker is more"
            isEmpty={!hasEstimate}
            emptyMessage={report.hasDeliveryRows ? "Audience estimates appear here once this campaign has modelled data." : NO_DELIVERY_MESSAGE}
            table={{ columns: ["Market", "Time of day", "Est. impressions"], rows: report.marketByDaypart.map((x) => [x.x, x.y, x.value]) }}
          >
            <Heatmap rows={[...REPORT_MARKETS]} columns={DAYPART_COLUMNS} cells={heatCells} valueFormatter={formatCompact} />
          </ChartCard>

          {hasEstimate ? <MarketMapCard markets={report.marketImpressions} /> : null}

          <LedgerCard
            title="Creative rotation"
            description="How plays were shared between this campaign's creatives"
            columns={CREATIVE_COLUMNS}
            rows={report.creatives}
            rowKey={(r) => r.name}
            empty="Creative plays appear here once the campaign is reporting."
          />

          <LedgerCard
            title="Daily log"
            description="The same rows as the PDF, newest first"
            columns={LOG_COLUMNS}
            rows={log.slice((logCurrent - 1) * LOG_PAGE_SIZE, logCurrent * LOG_PAGE_SIZE)}
            rowKey={(r) => r.day}
            footer={{
              viewing: `Viewing ${Math.min(LOG_PAGE_SIZE, log.length - (logCurrent - 1) * LOG_PAGE_SIZE)} out of ${log.length}`,
              page: logCurrent,
              pageCount: logPages,
              onPageChange: setLogPage,
            }}
            empty={NO_DELIVERY_MESSAGE}
          />

          {report.budget.budgetKes !== null ? (
            <DashboardCard title="Budget" description="Across the whole flight, whatever range is selected">
              <div className="grid gap-2 sm:grid-cols-3">
                <MetricTile label="Budget" value={formatKes(report.budget.budgetKes)} note="Set on the campaign" />
                <MetricTile label="Spent" value={report.budget.spentKes === null ? "—" : formatKes(report.budget.spentKes)} note="Charged so far" />
                <MetricTile label="Remaining" value={report.budget.remainingKes === null ? "—" : formatKes(report.budget.remainingKes)} note="Left to spend" />
              </div>
              {report.budget.spentKes !== null ? (
                <SegmentGauge value={report.budget.spentKes} max={report.budget.budgetKes} label="Budget used" />
              ) : null}
            </DashboardCard>
          ) : null}
        </>
      )}

      <HowWeEstimateSheet open={explainOpen} onOpenChange={setExplainOpen} level={report?.measurementLevel ?? "booked"} />
    </div>
  )
}

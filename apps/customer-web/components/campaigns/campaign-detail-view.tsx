"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarRange,
  FileDown,
  Image as ImageIcon,
  Pencil,
  Wallet,
} from "lucide-react"
import {
  describeCampaignObjectives,
  exportFileName,
  formatKes as formatKesNumber,
  type CampaignDto,
  type CampaignFormat,
  type ReportCampaignRowDto,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { CampaignReviewBanner } from "@/components/campaigns/campaign-review-banner"
import { CreativeUploadField } from "@/components/campaigns/creative-upload-field"
import {
  FORMAT_LABELS,
  flightLabel,
  flightOf,
  flightRange,
  shortDate,
  shortTimestamp,
} from "@/components/campaigns/flight"
import { FlightTrack } from "@/components/campaigns/flight-track"
import { HEALTH_LABEL, HEALTH_TONE, compactOrDash, percentOrDash } from "@/components/reports/format"
import { CampaignDetailSkeleton } from "@/components/skeletons/campaign-detail-skeleton"
import { StatCard } from "@/components/stat-card"
import { useReportCampaigns } from "@/lib/use-analytics"
import { useCampaign, useDownloadPdf } from "@/lib/use-campaigns"
import { useOrgPermissions } from "@/lib/use-org"

const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

function formatKes(value: string | null): string {
  if (!value) return "—"
  return `KES ${Number(value).toLocaleString("en-KE")}`
}

/** "2 images · 1 video", so the stat says what's on the screens, not just how many files. */
function creativeMix(campaign: CampaignDto): string | undefined {
  if (campaign.creatives.length === 0) return undefined
  const videos = campaign.creatives.filter((c) => c.resource_type === "video").length
  const images = campaign.creatives.length - videos
  return [
    images ? `${images} image${images === 1 ? "" : "s"}` : null,
    videos ? `${videos} video${videos === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Value + hint for the Flight stat: where today sits in a booked flight, or what was asked for. */
function flightStat(campaign: CampaignDto): { value: string; hint?: string } {
  const flight = flightOf(campaign.starts_on, campaign.ends_on)
  if (flight.kind === "unscheduled") return { value: "Not scheduled" }
  const range = flightRange(campaign.starts_on, campaign.ends_on)
  if (campaign.status !== "approved") return { value: `${flight.totalDays} days`, hint: `Requested · ${range}` }
  return { value: flightLabel(flight), hint: range }
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight tabular-nums">{value}</dd>
      {hint ? <dd className="text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  )
}

/**
 * A booked flight's progress line, plus how delivery is going once plays were scheduled. Only for
 * approved, dated campaigns — anything else has no flight on the street to show.
 */
function FlightProgressCard({
  campaign,
  report,
  canReport,
}: {
  campaign: CampaignDto
  report: ReportCampaignRowDto | undefined
  canReport: boolean
}) {
  if (campaign.status !== "approved" || !campaign.starts_on || !campaign.ends_on) return null
  const flight = flightOf(campaign.starts_on, campaign.ends_on)
  const delivering = report && report.playsScheduled > 0
  const daysLeft =
    flight.kind === "running"
      ? flight.daysLeft === 0
        ? "Last day"
        : `${flight.daysLeft} day${flight.daysLeft === 1 ? "" : "s"} left`
      : null

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-semibold">Flight progress</h2>
          <p className="text-sm">
            <span className={flight.kind === "running" ? "font-medium text-primary" : "font-medium"}>
              {flightLabel(flight)}
            </span>
            {daysLeft ? <span className="text-muted-foreground"> · {daysLeft}</span> : null}
          </p>
        </div>
        <div>
          <FlightTrack flight={flight} active size="lg" />
          <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{shortDate(campaign.starts_on)}</span>
            <span>{shortDate(campaign.ends_on)}</span>
          </div>
        </div>
        {delivering ? (
          <div className="space-y-4 border-t pt-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Figure
                label="Plays delivered"
                value={report.playsDelivered.toLocaleString("en-KE")}
                hint={`of ${report.playsScheduled.toLocaleString("en-KE")} scheduled`}
              />
              <Figure label="Delivery rate" value={percentOrDash(report.deliveryRate)} />
              <Figure label="Est. impressions" value={compactOrDash(report.impressions.likely)} />
              {report.spentKes !== null ? (
                <Figure
                  label="Spent"
                  value={formatKesNumber(report.spentKes)}
                  hint={report.budgetKes !== null ? `of ${formatKesNumber(report.budgetKes)}` : null}
                />
              ) : null}
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {report.health.level !== "on_track" ? (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusPill tone={HEALTH_TONE[report.health.level]}>
                    {HEALTH_LABEL[report.health.level]}
                  </StatusPill>
                  <span className="text-muted-foreground">{report.health.reason}</span>
                </p>
              ) : (
                <span />
              )}
              {canReport ? (
                <Link
                  href={`/reports/campaigns/${campaign.id}`}
                  className="group/link inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Full report
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform duration-150 ease-out group-hover/link:translate-x-0.5"
                  />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function CampaignDetailView({ id }: { id: number }) {
  const campaignQuery = useCampaign(id)
  const downloadPdf = useDownloadPdf()
  const { can } = useOrgPermissions()
  const canReport = can("reports:read")
  // Same query (and cache entry) as the campaigns list, so arriving from it costs nothing.
  const reportQuery = useReportCampaigns({ range: "all" }, {}, { enabled: canReport })

  const backLink = (
    <Link
      href="/campaigns"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to campaigns
    </Link>
  )

  // Same skeleton the route's loading.tsx renders — the server render is
  // instant, so this is the wait people actually see; a different shape here
  // would make the page shift twice.
  if (campaignQuery.isPending) return <CampaignDetailSkeleton />

  const campaign = campaignQuery.data
  if (!campaign) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {backLink}
        <p className="text-sm text-muted-foreground">
          This campaign isn&apos;t available on your account.
        </p>
      </div>
    )
  }

  const editable = EDITABLE_STATUSES.has(campaign.status)
  const report = reportQuery.data?.items.find((row) => row.id === campaign.id)
  const format = FORMAT_LABELS[campaign.format] ?? campaign.format
  const flight = flightStat(campaign)
  const flightDays = flightOf(campaign.starts_on, campaign.ends_on)

  const detailRows = [
    { label: "Market", value: campaign.market ?? "—" },
    {
      label: "Flight",
      value:
        flightDays.kind === "unscheduled"
          ? "Not scheduled"
          : `${flightRange(campaign.starts_on, campaign.ends_on)} (${flightDays.totalDays} day${flightDays.totalDays === 1 ? "" : "s"})`,
    },
    { label: "Format", value: format },
    { label: "Objective", value: describeCampaignObjectives(campaign.objective) },
    { label: "Corridors", value: campaign.corridors ?? "—" },
    ...(campaign.created_by_name
      ? [{ label: "Created by", value: `${campaign.created_by_name} · ${shortTimestamp(campaign.created_at)}` }]
      : [{ label: "Created", value: shortTimestamp(campaign.created_at) }]),
    ...(campaign.submitted_at
      ? [{ label: "Submitted for review", value: shortTimestamp(campaign.submitted_at) }]
      : []),
    ...(campaign.reviewed_at && campaign.status === "approved"
      ? [{ label: "Approved", value: shortTimestamp(campaign.reviewed_at) }]
      : []),
  ]

  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-3">
        {backLink}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
              {campaign.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[campaign.market, format].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CampaignStatusBadge status={campaign.status} flightPhase={campaign.flight_phase} />
            <StatusPill tone={campaign.funded_at ? "good" : "neutral"}>
              {campaign.funded_at ? "Funded" : "Not funded"}
            </StatusPill>
            {editable ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/campaigns/new?id=${campaign.id}`}>
                  <Pencil data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
            ) : null}
            {canReport && campaign.status === "approved" && campaign.starts_on ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/reports/campaigns/${campaign.id}`}>
                  <BarChart3 data-icon="inline-start" />
                  View report
                </Link>
              </Button>
            ) : null}
            {/* Only an approved, scheduled flight has a delivery record — the
                API refuses anything else, so the button isn't offered. */}
            {campaign.status === "approved" && campaign.starts_on && campaign.ends_on ? (
              <Button
                size="sm"
                variant="outline"
                loading={downloadPdf.isPending}
                loadingText="Preparing…"
                onClick={() =>
                  downloadPdf.mutate({
                    path: `/v1/customer/campaigns/${campaign.id}/proof-of-play`,
                    filename: exportFileName("proof of play", campaign.name, "pdf"),
                  })
                }
              >
                <FileDown data-icon="inline-start" />
                Proof of play
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <CampaignReviewBanner campaign={campaign} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Budget"
          value={formatKes(campaign.budget_kes)}
          icon={Wallet}
          hint={
            campaign.funded_at
              ? `Funded ${shortTimestamp(campaign.funded_at)}`
              : campaign.status === "draft"
                ? undefined
                : "Not funded yet"
          }
        />
        <StatCard
          label="Creative"
          value={`${campaign.creatives.length} file${campaign.creatives.length === 1 ? "" : "s"}`}
          icon={ImageIcon}
          hint={creativeMix(campaign)}
        />
        <StatCard label="Flight" value={flight.value} icon={CalendarRange} hint={flight.hint} />
      </div>

      <FlightProgressCard campaign={campaign} report={report} canReport={canReport} />

      <Card className="shadow-none">
        <CardContent className="p-4">
          {detailRows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 border-b border-border py-2.5 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="max-w-[60%] text-right font-medium">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          Creative
          <span className="font-normal tabular-nums text-muted-foreground">
            {campaign.creatives.length}
          </span>
        </h2>
        {editable ? (
          <CreativeUploadField
            campaignId={campaign.id}
            format={campaign.format as CampaignFormat}
            creatives={campaign.creatives}
          />
        ) : campaign.creatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No creative uploaded.</p>
        ) : (
          <CreativeUploadField
            campaignId={campaign.id}
            format={campaign.format as CampaignFormat}
            creatives={campaign.creatives}
            disabled
          />
        )}
      </section>
    </div>
  )
}

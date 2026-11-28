"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, LayoutGrid, MapPin, Plus, Rows3, UserRound } from "lucide-react"
import type { CampaignDto, ReportCampaignRowDto } from "@workspace/ops-contracts"

import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import {
  FORMAT_LABELS,
  flightLabel,
  flightOf,
  flightRange,
  shortTimestamp,
} from "@/components/campaigns/flight"
import { FlightTrack } from "@/components/campaigns/flight-track"
import { HEALTH_LABEL, HEALTH_TONE, percentOrDash, rateTone } from "@/components/reports/format"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton"
import { useReportCampaigns } from "@/lib/use-analytics"
import { useCampaigns } from "@/lib/use-campaigns"
import { useOrg, useOrgPermissions } from "@/lib/use-org"

/** Filters follow what an advertiser actually asks ("what's running?", "what's
 * waiting on me?"), not the raw status column. */
const FILTERS = [
  { label: "All", match: () => true },
  { label: "Live", match: (c: CampaignDto) => c.flight_phase === "live" },
  { label: "In queue", match: (c: CampaignDto) => c.status === "submitted" },
  { label: "Scheduled", match: (c: CampaignDto) => c.flight_phase === "scheduled" },
  {
    label: "Needs changes",
    match: (c: CampaignDto) => c.status === "rejected" || c.status === "changes_requested",
  },
  { label: "Draft", match: (c: CampaignDto) => c.status === "draft" },
] as const

function formatBudget(value: string | null): string {
  if (!value) return "—"
  return `KES ${Number(value).toLocaleString("en-KE")}`
}

function formatFlight(campaign: CampaignDto): string {
  if (!campaign.starts_on || !campaign.ends_on) return "Not scheduled"
  return flightRange(campaign.starts_on, campaign.ends_on)
}

/** "Day 6 of 14" for a booked flight; dates on a brief still in review are only requested. */
function flightStatus(campaign: CampaignDto): string | null {
  const flight = flightOf(campaign.starts_on, campaign.ends_on)
  if (flight.kind === "unscheduled") return null
  if (campaign.status !== "approved") return `${flight.totalDays}-day flight requested`
  return flightLabel(flight)
}

/** Delivery only means something once plays were scheduled; null keeps "—" from reading as 0%. */
function deliveryOf(report: ReportCampaignRowDto | undefined): ReportCampaignRowDto | null {
  return report && report.playsScheduled > 0 ? report : null
}

/**
 * The card's third figure is whatever matters most at that stage: delivery once plays were
 * scheduled, otherwise whether the budget is paid, and for a draft when it was last touched.
 */
function CardThirdFigure({
  campaign,
  delivery,
}: {
  campaign: CampaignDto
  delivery: ReportCampaignRowDto | null
}) {
  if (delivery) {
    const unhealthy = campaign.flight_phase === "live" && delivery.health.level !== "on_track"
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground">Delivered</p>
        <p className="text-sm font-semibold">
          <DeliveredValue report={delivery} />
        </p>
        {unhealthy ? (
          <StatusPill tone={HEALTH_TONE[delivery.health.level]} className="mt-1">
            {HEALTH_LABEL[delivery.health.level]}
          </StatusPill>
        ) : null}
      </div>
    )
  }
  if (campaign.status === "draft") {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground">Last edited</p>
        <p className="text-sm font-semibold">{shortTimestamp(campaign.updated_at)}</p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Payment</p>
      <p className={cn("text-sm font-semibold", !campaign.funded_at && "text-muted-foreground")}>
        {campaign.funded_at ? "Funded" : "Not funded"}
      </p>
    </div>
  )
}

const RATE_TEXT = {
  good: "text-foreground",
  warning: "text-amber-700 dark:text-amber-300",
  serious: "text-destructive",
  neutral: "text-muted-foreground",
} as const

function DeliveredValue({ report }: { report: ReportCampaignRowDto }) {
  return (
    <span className={cn("tabular-nums", RATE_TEXT[rateTone(report.deliveryRate)])}>
      {percentOrDash(report.deliveryRate)}
    </span>
  )
}

function campaignHref(campaign: CampaignDto): string {
  return campaign.status === "draft"
    ? `/campaigns/new?id=${campaign.id}`
    : `/campaigns/${campaign.id}`
}

type ViewMode = "cards" | "table"

const VIEW_MODE_KEY = "admobi.campaigns.view"

/** Read after mount, not in the initializer — the server render has no
 * localStorage and a mismatched first paint would hydrate-error. */
function useViewMode() {
  const [mode, setMode] = useState<ViewMode>("cards")

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_MODE_KEY)
    if (stored === "cards" || stored === "table") setMode(stored)
  }, [])

  function changeMode(next: ViewMode) {
    setMode(next)
    window.localStorage.setItem(VIEW_MODE_KEY, next)
  }

  return [mode, changeMode] as const
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const options = [
    { value: "cards" as const, label: "Cards", icon: LayoutGrid },
    { value: "table" as const, label: "Table", icon: Rows3 },
  ]

  return (
    <div
      role="group"
      aria-label="Campaign layout"
      className="inline-flex w-fit shrink-0 gap-1 rounded-lg bg-muted p-1"
    >
      {options.map((option) => {
        const active = mode === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function CampaignsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-none">
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function CampaignsTable({
  campaigns,
  showOwner,
  reports,
}: {
  campaigns: CampaignDto[]
  showOwner: boolean
  /** Null when the viewer can't read reports — the column is left out rather than shown empty. */
  reports: Map<number, ReportCampaignRowDto> | null
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead className="w-36">Status</TableHead>
            <TableHead className="w-40">Market</TableHead>
            <TableHead className="w-56">Flight</TableHead>
            {showOwner ? <TableHead className="w-44">Created by</TableHead> : null}
            <TableHead className="w-24 text-right">Creative</TableHead>
            {reports ? <TableHead className="w-28 text-right">Delivered</TableHead> : null}
            <TableHead className="w-36 text-right">Budget</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => {
            const href = campaignHref(campaign)
            const status = flightStatus(campaign)
            const delivery = deliveryOf(reports?.get(campaign.id))
            return (
              <TableRow key={campaign.id}>
                <TableCell className="p-0">
                  <Link href={href} className="block px-2 py-2">
                    <span className="block max-w-72 truncate font-medium" title={campaign.name}>
                      {campaign.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {FORMAT_LABELS[campaign.format] ?? campaign.format}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <CampaignStatusBadge
                    status={campaign.status}
                    flightPhase={campaign.flight_phase}
                  />
                </TableCell>
                <TableCell className="p-0">
                  <Link href={href} className="block max-w-40 truncate px-2 py-2 text-muted-foreground">
                    {campaign.market ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={href} className="block px-2 py-2 tabular-nums text-muted-foreground">
                    <span className="block">{formatFlight(campaign)}</span>
                    {status ? (
                      <span
                        className={cn(
                          "block text-xs",
                          campaign.flight_phase === "live" && "font-medium text-primary",
                        )}
                      >
                        {status}
                      </span>
                    ) : null}
                  </Link>
                </TableCell>
                {showOwner ? (
                  <TableCell className="p-0">
                    <Link href={href} className="block max-w-48 truncate px-2 py-2 text-muted-foreground">
                      {campaign.created_by_name ?? "—"}
                    </Link>
                  </TableCell>
                ) : null}
                <TableCell className="p-0 text-right">
                  <Link href={href} className="block px-2 py-2 tabular-nums">
                    {campaign.creatives.length}
                  </Link>
                </TableCell>
                {reports ? (
                  <TableCell className="p-0 text-right">
                    <Link href={href} className="block px-2 py-2">
                      {delivery ? <DeliveredValue report={delivery} /> : <span className="text-muted-foreground">—</span>}
                    </Link>
                  </TableCell>
                ) : null}
                <TableCell className="p-0 text-right">
                  <Link href={href} className="block px-2 py-2 tabular-nums">
                    {formatBudget(campaign.budget_kes)}
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function CampaignsView() {
  const [filter, setFilter] = useState<string>("All")
  const [viewMode, setViewMode] = useViewMode()
  const campaignsQuery = useCampaigns()
  const orgQuery = useOrg()
  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data])
  const multiMember = (orgQuery.data?.memberCount ?? 1) > 1
  const { can } = useOrgPermissions()
  const canReport = can("reports:read")
  // Lifetime delivery per campaign. Same query (and cache entry) the reports page and the
  // campaign page use.
  const reportQuery = useReportCampaigns({ range: "all" }, {}, { enabled: canReport })
  const reports = useMemo(
    () => (canReport ? new Map((reportQuery.data?.items ?? []).map((row) => [row.id, row])) : null),
    [canReport, reportQuery.data],
  )

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.label === filter) ?? FILTERS[0]
    return campaigns.filter(active.match)
  }, [campaigns, filter])

  return (
    <div className="relative flex flex-1 flex-col gap-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create, schedule, and monitor out-of-home flights. Every campaign is reviewed by our
            team before it goes live.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/calendar">
            <CalendarDays data-icon="inline-start" />
            Calendar
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.label
            const count = campaigns.filter(item.match).length
            return (
              <Button
                key={item.label}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(!active && "text-muted-foreground")}
                onClick={() => setFilter(item.label)}
              >
                {item.label}
                {campaignsQuery.isPending ? null : (
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-primary-foreground/75" : "text-muted-foreground/70",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Button>
            )
          })}
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {campaignsQuery.isPending ? (
        // Same skeleton as campaigns/loading.tsx — the server render is
        // instant, so this is the wait people actually see.
        viewMode === "table" ? (
          <CampaignsTableSkeleton rows={5} />
        ) : (
          <CardGridSkeleton count={4} />
        )
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
          <p className="text-sm font-medium">
            {campaigns.length === 0 ? "No campaigns yet" : `Nothing matches "${filter}"`}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {campaigns.length === 0
              ? "Build your first flight — brief, dates, budget, and creative — and send it for review."
              : "Try another filter."}
          </p>
          {campaigns.length === 0 ? (
            <Button asChild className="mt-1">
              <Link href="/campaigns/new">
                <Plus data-icon="inline-start" />
                New campaign
              </Link>
            </Button>
          ) : null}
        </div>
      ) : viewMode === "table" ? (
        <CampaignsTable campaigns={visible} showOwner={multiMember} reports={reports} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((campaign) => {
            const href = campaignHref(campaign)
            return (
            <Link key={campaign.id} href={href} className="block">
              <Card className="shadow-none transition-colors hover:bg-muted/20">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <CardTitle className="min-w-0 text-base leading-snug [overflow-wrap:anywhere]">{campaign.name}</CardTitle>
                  <CampaignStatusBadge
                    status={campaign.status}
                    flightPhase={campaign.flight_phase}
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0" />
                      {campaign.market ?? "Market not set"}
                      <span aria-hidden>·</span>
                      {FORMAT_LABELS[campaign.format] ?? campaign.format}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <CalendarDays className="size-3.5 shrink-0" />
                      <span className="tabular-nums">{formatFlight(campaign)}</span>
                      {flightStatus(campaign) ? (
                        <>
                          <span aria-hidden>·</span>
                          <span
                            className={cn(
                              campaign.flight_phase === "live" && "font-medium text-primary",
                            )}
                          >
                            {flightStatus(campaign)}
                          </span>
                        </>
                      ) : null}
                    </p>
                    {/* Only meaningful once an org has more than one person. */}
                    {campaign.created_by_name && multiMember ? (
                      <p className="flex items-center gap-2">
                        <UserRound className="size-3.5 shrink-0" />
                        {campaign.created_by_name}
                      </p>
                    ) : null}
                  </div>
                  {/* Only a booked flight gets the progress line; a requested one isn't on air yet. */}
                  {campaign.status === "approved" && campaign.starts_on && campaign.ends_on ? (
                    <FlightTrack flight={flightOf(campaign.starts_on, campaign.ends_on)} active />
                  ) : null}
                  {campaign.status === "rejected" || campaign.status === "changes_requested" ? (
                    <p className="line-clamp-2 text-sm text-destructive">
                      {campaign.review_reason ?? "Our team asked for changes before this can be approved."}
                    </p>
                  ) : null}
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Creative</p>
                      <p className="text-sm font-semibold">
                        {campaign.creatives.length} file
                        {campaign.creatives.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Budget</p>
                      <p className="text-sm font-semibold tabular-nums">{formatBudget(campaign.budget_kes)}</p>
                    </div>
                    <CardThirdFigure campaign={campaign} delivery={deliveryOf(reports?.get(campaign.id))} />
                  </div>
                  {campaign.status === "draft" ? (
                    <p className="text-xs font-medium text-primary">Continue editing →</p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
            )
          })}
        </div>
      )}

      <Button
        asChild
        className="fixed bottom-6 right-6 z-10 gap-2 rounded-full px-5 shadow-lg md:bottom-8 md:right-8"
      >
        <Link href="/campaigns/new">
          <Plus className="size-4" />
          New campaign
        </Link>
      </Button>
    </div>
  )
}

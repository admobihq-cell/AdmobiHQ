"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import {
  formatCompact,
  formatKes,
  formatRelativeTime,
  type CampaignDto,
  type ReportRange,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { DashboardToolbar } from "@workspace/ui/components/dashboard/dashboard-toolbar"
import { KpiStrip, type KpiItem } from "@workspace/ui/components/dashboard/kpi-strip"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ActiveCampaigns } from "@/components/overview/active-campaigns"
import { Greeting } from "@/components/overview/greeting"
import { NeedsAttentionCard, buildAttentionItems } from "@/components/overview/needs-attention-card"
import { SpendDeliveryCard, type TrendSource } from "@/components/overview/spend-delivery-card"
import { percentOrDash, rangeText } from "@/components/reports/format"
import { ActivityListSkeleton } from "@/components/skeletons/activity-list-skeleton"
import type { RangeParams } from "@/lib/analytics-client"
import { useFinanceSummary, useReportOverview } from "@/lib/use-analytics"
import { useCampaigns } from "@/lib/use-campaigns"
import { useCustomerNotifications } from "@/lib/use-customer-notifications"
import { useDashboardParams } from "@/lib/use-dashboard-params"
import { useOrgPermissions } from "@/lib/use-org"

/**
 * Campaign counts come from the campaign feed, and spend, funds, impressions and delivery from
 * the finance and report endpoints, each shown only to people with that permission. A figure the
 * viewer can't see, or that has no data behind it, is left out or shown as a dash: there are no
 * invented numbers on this page.
 */

const NEEDS_YOU = new Set(["draft", "rejected", "changes_requested"])

function summarize(campaigns: CampaignDto[]) {
  const live = campaigns.filter((c) => c.flight_phase === "live").length
  const scheduled = campaigns.filter((c) => c.flight_phase === "scheduled").length
  const inReview = campaigns.filter((c) => c.status === "submitted").length
  const needsYou = campaigns.filter((c) => NEEDS_YOU.has(c.status)).length
  // Only approved flights count as committed — a draft's budget is a guess
  // until our team agrees to run it.
  const approved = campaigns.filter((c) => c.status === "approved")
  const committed = approved.reduce((total, c) => total + Number(c.budget_kes ?? 0), 0)

  return { live, scheduled, inReview, needsYou, committed, approved: approved.length }
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** The window before this one, as explicit dates so it can be fetched with the same endpoints. */
const previousParams = (range: ReportRange | undefined): RangeParams | undefined =>
  range?.previous ? { from: range.previous.start, to: range.previous.end } : undefined

export function OverviewView() {
  const { can } = useOrgPermissions()
  const canBilling = can("billing:read")
  const canReports = can("reports:read")
  const { range, setRange } = useDashboardParams("overview")

  const campaignsQuery = useCampaigns()
  const notifications = useCustomerNotifications()
  const finance = useFinanceSummary(range, { enabled: canBilling })
  const report = useReportOverview(range, {}, { enabled: canReports })
  const previous = previousParams(finance.data?.range ?? report.data?.range)
  const prevFinance = useFinanceSummary(previous ?? range, { enabled: canBilling && !!previous })
  const prevReport = useReportOverview(previous ?? range, {}, { enabled: canReports && !!previous })

  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data])
  const stats = useMemo(() => summarize(campaigns), [campaigns])
  const recent = useMemo(() => notifications.items.slice(0, 5), [notifications.items])
  const upcoming = useMemo(
    () =>
      campaigns
        .filter((c) => c.flight_phase === "scheduled" && c.starts_on)
        .sort((a, b) => a.starts_on!.localeCompare(b.starts_on!))
        .slice(0, 4),
    [campaigns]
  )

  const f = finance.data
  const r = report.data
  const kpis: KpiItem[] = [
    {
      label: "Live campaigns",
      value: String(stats.live),
      note: stats.scheduled > 0 ? `${plural(stats.scheduled, "flight")} scheduled` : "In market right now",
    },
    ...(canBilling
      ? [
          {
            label: "Available funds",
            value: f?.availableKes == null ? "—" : formatKes(f.availableKes),
            note: f?.availableKes == null ? "Appears after your first top-up" : "Balance minus committed",
          },
          {
            label: "Spent",
            value: f ? formatKes(f.spentKes.current) : "—",
            note: "In the selected period",
            delta: f ? { delta: f.spentKes, good: "neutral" as const } : undefined,
          },
        ]
      : []),
    ...(canReports
      ? [
          {
            label: "Est. impressions",
            value: r?.impressions ? formatCompact(r.impressions.current) : "—",
            note: r?.impressions ? (rangeText(r.impressions.low, r.impressions.high) ?? "Estimate") : "No audience estimate yet",
            delta: r?.impressions ? { delta: r.impressions, good: "up" as const } : undefined,
          },
          {
            label: "Delivery",
            value: percentOrDash(r?.deliveryRate?.current),
            note: "Plays delivered ÷ scheduled",
            delta: r?.deliveryRate ? { delta: r.deliveryRate, good: "up" as const } : undefined,
          },
        ]
      : []),
  ]

  const sources: TrendSource[] = [
    ...(canBilling && f
      ? [
          {
            key: "spend" as const,
            label: "Spend",
            current: f.spendTrend,
            previous: prevFinance.data?.spendTrend,
            field: "spent",
            format: formatKes,
            empty: "Spending appears here once your campaigns are charged.",
          },
        ]
      : []),
    ...(canReports && r
      ? [
          {
            key: "impressions" as const,
            label: "Impressions",
            current: r.impressionsTrend,
            previous: prevReport.data?.impressionsTrend,
            field: "impressions",
            format: formatCompact,
            empty: "Audience estimates appear here once your campaigns have modelled data.",
          },
          {
            key: "plays" as const,
            label: "Plays",
            current: r.pacing.days,
            previous: prevReport.data?.pacing.days,
            field: "delivered",
            format: formatCompact,
            empty: "Delivery numbers appear here once your campaigns are reporting.",
          },
        ]
      : []),
  ]

  const attention = buildAttentionItems({
    finance: canBilling ? f : undefined,
    rows: canReports ? r?.ledger.rows : undefined,
    campaigns,
  })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            <Greeting />
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Your campaigns at a glance</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            What&apos;s in market right now, what&apos;s with our review team, and what&apos;s waiting on you.
          </p>
        </div>
        <Button className="h-10 gap-2" asChild>
          <Link href="/campaigns/new">
            <Plus className="size-4" />
            New campaign
          </Link>
        </Button>
      </div>

      {canBilling || canReports ? <DashboardToolbar range={range} onRangeChange={setRange} /> : null}

      {campaignsQuery.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <KpiStrip items={kpis} columns={Math.min(5, Math.max(2, kpis.length)) as 2 | 3 | 4 | 5} />
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {sources.length > 0 ? (
            <SpendDeliveryCard key={sources.map((s) => s.key).join()} sources={sources} />
          ) : canBilling || canReports ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <DashboardCard title="Spend and delivery" description="Charts for your campaigns">
              <p className="rounded-md border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">
                Ask your account owner for report or billing access to see spend and delivery here.
              </p>
            </DashboardCard>
          )}
        </div>
        <NeedsAttentionCard items={attention} />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active campaigns</p>
        {campaignsQuery.isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <ActiveCampaigns campaigns={campaigns} rows={canReports ? r?.ledger.rows : undefined} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming flights</p>
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              No flights are scheduled. Plan one on the calendar.
            </p>
          ) : (
            <Card className="shadow-none">
              <CardContent className="p-0">
                {upcoming.map((c, index) => (
                  <div key={c.id}>
                    {index > 0 ? <Separator /> : null}
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.market ?? "No market"}</p>
                      </div>
                      <p className="shrink-0 text-xs font-medium text-muted-foreground">Starts {c.starts_on}</p>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</p>
          {notifications.isPending ? (
            <ActivityListSkeleton rows={4} />
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
              <p className="text-sm font-medium">Nothing has happened yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Submit a campaign and every review decision, schedule change, and announcement lands here.
              </p>
            </div>
          ) : (
            <Card className="shadow-none">
              <CardContent className="p-0">
                {recent.map((item, index) => {
                  const row = (
                    <div className="flex items-start gap-4 p-4">
                      <span
                        className={
                          item.readAt
                            ? "mt-1.5 size-2.5 shrink-0 rounded-full bg-muted-foreground/30"
                            : "mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
                        }
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                      </div>
                      <p className="shrink-0 text-xs font-medium text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  )
                  return (
                    <div key={item.id}>
                      {index > 0 ? <Separator /> : null}
                      {item.href ? (
                        <Link href={item.href} className="block transition-colors hover:bg-muted/20">
                          {row}
                        </Link>
                      ) : (
                        row
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

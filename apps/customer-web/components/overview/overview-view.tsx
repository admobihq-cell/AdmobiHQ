"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ClipboardList,
  Map,
  Megaphone,
  Pencil,
  Plus,
  Radio,
  Wallet,
} from "lucide-react"
import { formatRelativeTime, type CampaignDto } from "@workspace/ops-contracts"

import { Greeting } from "@/components/overview/greeting"
import { ActivityListSkeleton } from "@/components/skeletons/activity-list-skeleton"
import { StatCardGridSkeleton } from "@/components/skeletons/stat-card-grid-skeleton"
import { StatCard } from "@/components/stat-card"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { useCampaigns } from "@/lib/use-campaigns"
import { useCustomerNotifications } from "@/lib/use-customer-notifications"

/** Everything on this page is derived from the two feeds the customer app
 * already has — `/v1/customer/campaigns` and the merged notification inbox.
 * Impressions, delivery rate and spend are deliberately absent: no endpoint
 * serves them yet, and a made-up number on a dashboard is worse than a
 * missing one. */

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

export function OverviewView() {
  const campaignsQuery = useCampaigns()
  const notifications = useCustomerNotifications()

  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data])
  const stats = useMemo(() => summarize(campaigns), [campaigns])
  const recent = useMemo(() => notifications.items.slice(0, 5), [notifications.items])

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          <Greeting />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Your campaigns at a glance
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          What&apos;s in market right now, what&apos;s with our review team, and what&apos;s
          waiting on you.
        </p>
      </div>

      {campaignsQuery.isPending ? (
        <StatCardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            icon={Radio}
            label="Live now"
            value={String(stats.live)}
            hint={stats.scheduled > 0 ? `${plural(stats.scheduled, "flight")} scheduled` : undefined}
          />
          <StatCard
            icon={ClipboardList}
            label="In review"
            value={String(stats.inReview)}
            hint={stats.inReview > 0 ? "With our team" : undefined}
          />
          <StatCard
            icon={Pencil}
            label="Needs you"
            value={String(stats.needsYou)}
            hint={stats.needsYou > 0 ? "Drafts and change requests" : undefined}
          />
          <StatCard
            icon={Wallet}
            label="Committed budget"
            value={`KES ${stats.committed.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`}
            hint={
              stats.approved > 0
                ? `Across ${plural(stats.approved, "approved flight")}`
                : undefined
            }
          />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </p>
        <div className="flex flex-wrap gap-3">
          <Button className="h-11 gap-2" asChild>
            <Link href="/campaigns/new">
              <Plus className="size-4" />
              New campaign
            </Link>
          </Button>
          <Button variant="outline" className="h-11 gap-2" asChild>
            <Link href="/campaigns">
              <Megaphone className="size-4" />
              View campaigns
            </Link>
          </Button>
          <Button variant="outline" className="h-11 gap-2" asChild>
            <Link href="/calendar">
              <CalendarDays className="size-4" />
              Plan calendar
            </Link>
          </Button>
          <Button variant="outline" className="h-11 gap-2" asChild>
            <Link href="/map">
              <Map className="size-4" />
              Open map
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent activity
        </p>
        {notifications.isPending ? (
          <ActivityListSkeleton rows={4} />
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
            <p className="text-sm font-medium">Nothing has happened yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Submit a campaign and every review decision, schedule change, and announcement
              lands here.
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
  )
}

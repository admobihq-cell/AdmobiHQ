"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, MapPin, Plus } from "lucide-react"
import type { CampaignDto } from "@workspace/ops-contracts"

import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton"
import { useCampaigns } from "@/lib/use-campaigns"

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
  return `${campaign.starts_on} → ${campaign.ends_on}`
}

export function CampaignsView() {
  const [filter, setFilter] = useState<string>("All")
  const campaignsQuery = useCampaigns()
  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data])

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

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const active = filter === item.label
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
            </Button>
          )
        })}
      </div>

      {campaignsQuery.isPending ? (
        // Same skeleton as campaigns/loading.tsx — the server render is
        // instant, so this is the wait people actually see.
        <CardGridSkeleton count={4} />
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
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((campaign) => {
            const href =
              campaign.status === "draft"
                ? `/campaigns/new?id=${campaign.id}`
                : `/campaigns/${campaign.id}`
            return (
            <Link key={campaign.id} href={href} className="block">
              <Card className="shadow-none transition-colors hover:bg-muted/20">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <CardTitle className="text-base leading-snug">{campaign.name}</CardTitle>
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
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="size-3.5 shrink-0" />
                      {formatFlight(campaign)}
                    </p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Creative</p>
                      <p className="text-sm font-semibold">
                        {campaign.creatives.length} file
                        {campaign.creatives.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Budget</p>
                      <p className="text-sm font-semibold">{formatBudget(campaign.budget_kes)}</p>
                    </div>
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

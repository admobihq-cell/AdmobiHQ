"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Eye, MapPin, Radio, Wallet } from "lucide-react"

import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { formatLabelFor, getCampaignById, type Campaign } from "@/lib/campaigns"

/** Deterministic illustrative spend-to-date, not a real ledger — matches this app's other placeholder metrics. */
const SPEND_FRACTION: Record<Campaign["status"], number> = {
  active: 0.64,
  scheduled: 0,
  draft: 0,
  completed: 1,
}

function parseKes(budget: string): number {
  return Number(budget.replace(/[^0-9]/g, "")) || 0
}

function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`
}

export function CampaignDetailView({ id }: { id: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setCampaign(getCampaignById(id))
    setLoaded(true)
  }, [id])

  const backLink = (
    <Link
      href="/campaigns"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to campaigns
    </Link>
  )

  if (!loaded) return null

  if (!campaign) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {backLink}
        <p className="text-sm text-muted-foreground">
          This campaign isn&apos;t available in this browser.
        </p>
      </div>
    )
  }

  const budgetKes = parseKes(campaign.budget)
  const spendFraction = SPEND_FRACTION[campaign.status]
  const spendKes = budgetKes * spendFraction
  const spendPct = Math.round(spendFraction * 100)
  const screensReached = Math.max(1, Math.round((budgetKes / 1000) * 0.8))
  const dailyPlays = Math.max(0, Math.round(screensReached * spendFraction * 6))

  const detailRows = [
    { label: "Market", value: campaign.market },
    { label: "Schedule", value: campaign.dates },
    { label: "Format", value: formatLabelFor(campaign.format) },
    { label: "Status", value: campaign.status, capitalize: true },
  ]

  return (
    <div className="flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-3">
        {backLink}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{campaign.name}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" />
            {campaign.market}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0" />
            {campaign.dates}
          </span>
          <span className="flex items-center gap-1.5">
            <Radio className="size-4 shrink-0" />
            {formatLabelFor(campaign.format)}
          </span>
        </div>
        {campaign.createdLocally ? (
          <p className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Created in this browser
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Budget" value={campaign.budget} />
        <StatCard
          icon={Wallet}
          label="Spent to date"
          value={formatKes(spendKes)}
          hint={`${spendPct}% of budget`}
        />
        <StatCard icon={Eye} label="Impressions" value={campaign.impressions} />
        <StatCard
          icon={Radio}
          label="Screens reached"
          value={String(screensReached)}
          hint={`${dailyPlays} plays/day avg`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Budget used
          </p>
          <Card className="shadow-none">
            <CardContent className="space-y-3 p-6">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${spendPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                GPS-verified proof-of-play populates here once the flight is live.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Flight details
          </p>
          <Card className="shadow-none">
            <CardContent className="p-0">
              {detailRows.map((row, index) => (
                <div key={row.label}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-center justify-between gap-3 p-4 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={cn("font-medium", row.capitalize && "capitalize")}>
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

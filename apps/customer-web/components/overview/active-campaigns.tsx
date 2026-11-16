"use client"

import Link from "next/link"
import { nairobiDay, type CampaignDto, type ReportCampaignRowDto } from "@workspace/ops-contracts"

import { ProgressCard } from "@workspace/ui/components/dashboard/progress-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { HEALTH_LABEL, HEALTH_TONE, percentOrDash } from "@/components/reports/format"

const DAY_MS = 86_400_000

/** How far through its flight a campaign is, 0 to 100. */
function flightPercent(startsOn: string, endsOn: string): number {
  const total = (Date.parse(endsOn) - Date.parse(startsOn)) / DAY_MS + 1
  const elapsed = (Date.parse(nairobiDay(new Date())) - Date.parse(startsOn)) / DAY_MS + 1
  return total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0
}

/** Up to three live campaigns: flight progress, delivery when reports are available, and the end date. */
export function ActiveCampaigns({
  campaigns,
  rows,
}: {
  campaigns: CampaignDto[]
  rows: ReportCampaignRowDto[] | undefined
}) {
  const live = campaigns.filter((c) => c.flight_phase === "live" && c.starts_on && c.ends_on).slice(0, 3)
  const byId = new Map((rows ?? []).map((r) => [r.id, r]))

  if (live.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        No campaigns are live right now.
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {live.map((c) => {
        const row = byId.get(c.id)
        return (
          <ProgressCard
            key={c.id}
            title={c.name}
            subtitle={c.market ?? undefined}
            status={row ? <StatusPill tone={HEALTH_TONE[row.health.level]}>{HEALTH_LABEL[row.health.level]}</StatusPill> : undefined}
            percent={flightPercent(c.starts_on!, c.ends_on!)}
            footer={
              <>
                <span>{row ? `Delivery ${percentOrDash(row.deliveryRate)}` : "Live"}</span>
                <span>Ends {c.ends_on}</span>
              </>
            }
            href={`/campaigns/${c.id}`}
            LinkComponent={Link}
          />
        )
      })}
    </div>
  )
}

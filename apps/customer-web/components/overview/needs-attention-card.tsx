"use client"

import Link from "next/link"
import { formatKes, type CampaignDto, type FinanceSummaryDto, type ReportCampaignRowDto } from "@workspace/ops-contracts"

import { ActionQueue, type ActionItem } from "@workspace/ui/components/dashboard/action-queue"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { HEALTH_LABEL, HEALTH_TONE } from "@/components/reports/format"

const NEEDS_YOU = new Set(["rejected", "changes_requested"])

/**
 * What to do next. The org-level funding alert leads (only for people who may see billing),
 * then campaigns that aren't on track. Without report access it falls back to campaigns the
 * review team sent back, which every member can see.
 */
export function buildAttentionItems({
  finance,
  rows,
  campaigns,
}: {
  finance: FinanceSummaryDto | undefined
  rows: ReportCampaignRowDto[] | undefined
  campaigns: CampaignDto[]
}): ActionItem[] {
  const items: ActionItem[] = []

  if (finance?.funding.level === "short") {
    items.push({
      title: `Short ${formatKes(-(finance.availableKes ?? 0))}`,
      meta: "Your active budgets are more than your balance",
      action: "Top up",
      tag: { label: "Funds", tone: "serious" },
      href: "/billing",
    })
  } else if (finance?.funding.level === "low") {
    items.push({
      title: "Funds are running low",
      meta: finance.funding.runwayDays === null ? "Top up to keep campaigns running" : `About ${finance.funding.runwayDays} days left at this pace`,
      action: "Top up",
      tag: { label: "Funds", tone: "warning" },
      href: "/billing",
    })
  }

  if (rows) {
    for (const row of rows.filter((r) => r.health.level !== "on_track")) {
      items.push({
        title: row.name,
        meta: row.health.reason,
        action: row.health.nextAction ?? "Open",
        tag: { label: HEALTH_LABEL[row.health.level], tone: HEALTH_TONE[row.health.level] },
        href: `/campaigns/${row.id}`,
      })
    }
  } else {
    for (const c of campaigns.filter((x) => NEEDS_YOU.has(x.status))) {
      items.push({
        title: c.name,
        meta: c.status === "rejected" ? "Rejected in review" : "Changes requested in review",
        action: "Open the review reason",
        tag: { label: "Action needed", tone: "serious" },
        href: `/campaigns/${c.id}`,
      })
    }
  }
  return items
}

export function NeedsAttentionCard({ items }: { items: ActionItem[] }) {
  return (
    <DashboardCard title="Needs attention" description="Funding and campaigns that need a decision">
      <ActionQueue items={items.slice(0, 6)} empty="Nothing needs your attention." LinkComponent={Link} />
    </DashboardCard>
  )
}

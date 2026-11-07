import type { FinanceSummaryDto } from "@workspace/ops-contracts"
import { formatKes } from "@workspace/ops-contracts"

import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { InsightNote } from "@workspace/ui/components/dashboard/notes"
import { StatusPill, type StatusTone } from "@workspace/ui/components/dashboard/status-pill"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"

const LEVEL: Record<Exclude<FinanceSummaryDto["funding"]["level"], "untracked">, { tone: StatusTone; label: string }> = {
  healthy: { tone: "good", label: "Healthy" },
  low: { tone: "warning", label: "Running low" },
  short: { tone: "serious", label: "Short of funds" },
}

/** "14 Dec", counting from today. */
function runOutDate(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000)
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" })
}

/**
 * The org-level funding state: a status chip, three tiles, and one plain sentence. With no
 * ledger rows it says so instead of showing a fake "healthy" or "short".
 */
export function FundingCard({ summary }: { summary: FinanceSummaryDto }) {
  const { funding } = summary

  if (funding.level === "untracked") {
    return (
      <DashboardCard title="Funding" description="Whether your funds cover current spending">
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Your funding details appear after your first top-up.
        </p>
      </DashboardCard>
    )
  }

  const { tone, label } = LEVEL[funding.level]
  const note =
    funding.level === "short"
      ? `Your active budgets are ${formatKes(-(summary.availableKes ?? 0))} more than your balance.`
      : funding.runwayDays === null
        ? "There is no recent spending to project from."
        : `At this pace, funds run out around ${runOutDate(funding.runwayDays)}.`

  return (
    <DashboardCard
      title="Funding"
      description="Based on your balance and the last 30 days of spend"
      action={<StatusPill tone={tone}>{label}</StatusPill>}
    >
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <MetricTile
          label="Runway"
          value={funding.runwayDays === null ? "—" : `${funding.runwayDays} days`}
          note="Available funds ÷ daily spend"
        />
        <MetricTile label="Committed" value={formatKes(summary.committedKes)} note="Left on live and scheduled budgets" />
        <MetricTile
          label="Next charge"
          value={funding.nextChargeKes === null ? "—" : formatKes(funding.nextChargeKes)}
          note={funding.nextChargeOn ?? "Nothing scheduled"}
        />
      </div>
      <InsightNote>{note}</InsightNote>
    </DashboardCard>
  )
}

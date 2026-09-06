import type { Campaign } from "@prisma/client"

import { campaignFlightPhase, toDayIso } from "@workspace/ops-contracts"

/**
 * Row-building for the two advertiser-facing PDFs — the budget statement the
 * calendar downloads, and a single campaign's proof-of-play.
 *
 * Kept out of the route files so the totals, the "active" definition, and the
 * per-day statuses are testable without rendering a PDF or standing up a DB.
 * Every value here is a pre-formatted string: DataTable takes strings only,
 * the same contract apps/ops/lib/format.ts's toCsv() works to.
 */

const DAY_MS = 86_400_000

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

const PHASE_LABELS: Record<string, string> = {
  live: "Live",
  scheduled: "Scheduled",
  completed: "Completed",
  unscheduled: "Not scheduled",
}

const FORMAT_LABELS: Record<string, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
}

export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`
}

export function budgetOf(campaign: Campaign): number {
  return campaign.budget_kes == null ? 0 : Number(campaign.budget_kes)
}

/** Inclusive: a flight that starts and ends on the same day is 1 day. */
export function flightDayCount(startsOn: Date | null, endsOn: Date | null): number {
  if (!startsOn || !endsOn) return 0
  const days = Math.round((endsOn.getTime() - startsOn.getTime()) / DAY_MS) + 1
  return days > 0 ? days : 0
}

/**
 * Money is committed once a campaign is approved and its flight has not yet
 * finished — that's what "active" means on the calendar's budget total, and
 * the PDF must agree with the number on screen. A draft or a campaign still
 * in review is a plan, not a commitment, so neither counts.
 */
export function isActive(campaign: Campaign, today?: Date): boolean {
  const phase = campaignFlightPhase(campaign.status, campaign.starts_on, campaign.ends_on, today)
  return phase === "live" || phase === "scheduled"
}

/** "to" rather than the arrow the web UI uses: the PDF font has no glyph for
 * U+2192 and Takumi throws on an uncovered codepoint rather than substituting
 * one. Everything written into a PDF row here stays inside Latin-1. */
function flightLabel(campaign: Campaign): string {
  if (!campaign.starts_on || !campaign.ends_on) return "Not scheduled"
  return `${toDayIso(campaign.starts_on)} to ${toDayIso(campaign.ends_on)}`
}

export type StatementTable = {
  subtitle: string
  summary: { label: string; value: string }[]
  headers: string[]
  rows: string[][]
  totalsRow: string[]
  footnote: string
}

export const BUDGET_STATEMENT_HEADERS = [
  "Campaign",
  "Market",
  "Flight",
  "Days",
  "Status",
  "Budget",
]

/**
 * The advertiser's campaign list with its budgets and a total, invoice-style.
 *
 * Both totals are shown rather than one: the active figure is the number the
 * calendar puts on screen, and the all-campaigns figure is what someone
 * reconciling a statement expects a total column to add up to.
 */
export function buildBudgetStatement(
  campaigns: Campaign[],
  options: { accountLabel: string; generatedAt: string; today?: Date },
): StatementTable {
  const active = campaigns.filter((campaign) => isActive(campaign, options.today))
  const activeTotal = active.reduce((sum, campaign) => sum + budgetOf(campaign), 0)
  const total = campaigns.reduce((sum, campaign) => sum + budgetOf(campaign), 0)

  const rows = campaigns.map((campaign) => [
    campaign.name,
    campaign.market ?? "",
    flightLabel(campaign),
    String(flightDayCount(campaign.starts_on, campaign.ends_on) || ""),
    PHASE_LABELS[
      campaignFlightPhase(campaign.status, campaign.starts_on, campaign.ends_on, options.today)
    ] ?? campaign.status,
    campaign.budget_kes == null ? "" : formatKes(budgetOf(campaign)),
  ])

  return {
    subtitle: `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} · generated ${options.generatedAt}`,
    summary: [
      { label: "Account", value: options.accountLabel },
      { label: "Statement date", value: options.generatedAt },
      {
        label: "Active campaigns",
        value: `${active.length} of ${campaigns.length}`,
      },
      { label: "Active budget", value: formatKes(activeTotal) },
    ],
    headers: BUDGET_STATEMENT_HEADERS,
    rows,
    totalsRow: ["Total, all campaigns", "", "", "", "", formatKes(total)],
    footnote:
      "Budgets are the amounts you set on each campaign. Approved flights are billed against the confirmed rate card; this statement is not a tax invoice.",
  }
}

export const PROOF_OF_PLAY_HEADERS = ["Date", "Day", "Market", "Panels", "Schedule status"]

/**
 * Day-by-day delivery record for one campaign.
 *
 * Deliberately reports the *schedule*, not measured plays: nothing in the
 * system logs a play yet (there is no telemetry model), so claiming a play
 * count here would be inventing one. The footnote says so out loud rather
 * than letting the title imply a measurement, and the per-day status is only
 * ever "Delivered" for a day the flight has actually passed.
 */
export function buildProofOfPlay(
  campaign: Campaign,
  options: { generatedAt: string; creativeCount: number; today?: Date },
): StatementTable {
  const totalDays = flightDayCount(campaign.starts_on, campaign.ends_on)
  const todayIso = toDayIso(options.today ?? new Date())
  const panels = FORMAT_LABELS[campaign.format] ?? campaign.format

  const rows: string[][] = []
  let delivered = 0
  for (let offset = 0; offset < totalDays; offset += 1) {
    const day = new Date(campaign.starts_on!.getTime() + offset * DAY_MS)
    const iso = toDayIso(day)
    const status = iso < todayIso ? "Delivered" : iso === todayIso ? "In flight" : "Scheduled"
    if (status === "Delivered") delivered += 1
    rows.push([iso, WEEKDAYS[day.getUTCDay()]!, campaign.market ?? "", panels, status])
  }

  return {
    subtitle: `${campaign.name} · generated ${options.generatedAt}`,
    summary: [
      { label: "Campaign", value: `#${campaign.id} ${campaign.name}` },
      { label: "Flight", value: flightLabel(campaign) },
      { label: "Panels", value: panels },
      { label: "Market", value: campaign.market ?? "" },
      {
        label: "Creative on rotation",
        value: `${options.creativeCount} file${options.creativeCount === 1 ? "" : "s"}`,
      },
      {
        label: "Budget",
        value: campaign.budget_kes == null ? "" : formatKes(budgetOf(campaign)),
      },
    ],
    headers: PROOF_OF_PLAY_HEADERS,
    rows,
    totalsRow: [
      "Delivered to date",
      `${delivered} of ${totalDays} day${totalDays === 1 ? "" : "s"}`,
      "",
      "",
      totalDays === 0 ? "—" : `${Math.round((delivered / totalDays) * 100)}%`,
    ],
    footnote:
      "Records the booked delivery schedule for this campaign. Per-play counts from the vehicle players are not yet reported into the platform, so no play volume is claimed here.",
  }
}

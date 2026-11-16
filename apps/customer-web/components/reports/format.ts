import {
  formatCompact,
  type CampaignFlightPhase,
  type DailyPoint,
  type HealthLevel,
} from "@workspace/ops-contracts"
import type { StatusTone } from "@workspace/ui/components/dashboard/status-pill"

export const HEALTH_LABEL: Record<HealthLevel, string> = {
  on_track: "On track",
  watch: "Watch",
  at_risk: "At risk",
  action_needed: "Action needed",
}

export const HEALTH_TONE: Record<HealthLevel, StatusTone> = {
  on_track: "good",
  watch: "warning",
  at_risk: "serious",
  action_needed: "serious",
}

export const PHASE_LABEL: Record<CampaignFlightPhase, string> = {
  unscheduled: "Not scheduled",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
}

export const NO_DELIVERY_MESSAGE = "Delivery numbers appear here once your campaigns are reporting."
export const NO_MATCH_MESSAGE = "Nothing matches these filters."

/** "1.2M", or an em dash when there is no estimate: null is not zero. */
export const compactOrDash = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : formatCompact(value)

/** "0.9M to 1.6M", or null when either end is missing. */
export function rangeText(low: number | null, high: number | null): string | null {
  return low === null || high === null ? null : `${formatCompact(low)} to ${formatCompact(high)}`
}

/** A 0..1 rate as "93%", or an em dash. */
export const percentOrDash = (rate: number | null | undefined) =>
  rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`

export function rateTone(rate: number | null): "good" | "warning" | "serious" | "neutral" {
  if (rate === null) return "neutral"
  if (rate >= 0.95) return "good"
  if (rate >= 0.8) return "warning"
  return "serious"
}

/**
 * Pacing is shown as percent of schedule. Up to two weeks it stays daily; beyond that it is
 * bucketed into 7-day weeks, weighted by scheduled plays, so a quiet day can't swing a bar.
 */
export function pacingBars(days: DailyPoint[]): { period: string; percent: number | null }[] {
  const shortDay = (day: string) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "UTC" })
  if (days.length <= 14) {
    return days.map((d) => ({ period: shortDay(d.day), percent: typeof d.percent === "number" ? d.percent : null }))
  }
  const bars: { period: string; percent: number | null }[] = []
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7)
    const scheduled = week.reduce((sum, d) => sum + Number(d.scheduled ?? 0), 0)
    const delivered = week.reduce((sum, d) => sum + Number(d.delivered ?? 0), 0)
    bars.push({
      period: shortDay(week[0]!.day),
      percent: scheduled > 0 ? Math.round((delivered / scheduled) * 1000) / 10 : null,
    })
  }
  return bars
}

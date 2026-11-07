import { formatCompact, type HealthLevel } from "@workspace/ops-contracts"
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

/** "1.2M", or a dash when there is no figure: no estimate is not zero. */
export const compactOrDash = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : formatCompact(value)

/** A 0..1 rate as "93%", or a dash. */
export const percentOrDash = (rate: number | null | undefined) =>
  rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`

export function rateTone(rate: number | null): "good" | "warning" | "serious" | "neutral" {
  if (rate === null) return "neutral"
  if (rate >= 0.95) return "good"
  if (rate >= 0.8) return "warning"
  return "serious"
}

/** "2d 4h" for a wait given in hours. */
export function waiting(hours: number): string {
  if (hours < 1) return "under an hour"
  if (hours < 24) return `${Math.floor(hours)}h`
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`
}

export const EMPTY_DELIVERY = "Delivery numbers appear here once campaigns are reporting."

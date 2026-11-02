import { formatKes } from "./format"

/**
 * Health is a set of plain rules, never a score: the first rule that matches
 * wins and says why. Thresholds are a starting point, tuned once real delivery
 * data exists.
 */
export const CREATIVE_LEAD_DAYS = 7
export const UNDER_DELIVERY_RATE = 0.8
export const WATCH_DELIVERY_RATE = 0.95
/** Both delivery rules (At risk and Watch) are skipped until this many days
 * into the flight: early delivery is noisy. */
export const MIN_DAYS_TO_JUDGE_DELIVERY = 3
export const ENDING_SOON_DAYS = 7
export const LOW_RUNWAY_DAYS = 14
export const REPEATED_REJECTIONS = 2
export const DORMANT_DAYS = 60
/** Spend down by more than this share of the previous period. */
export const SPEND_DOWN_SHARE = 0.5

export const HEALTH_LEVELS = ["action_needed", "at_risk", "watch", "on_track"] as const
export type HealthLevel = (typeof HEALTH_LEVELS)[number]

export type HealthResult = {
  level: HealthLevel
  reason: string
  nextAction: string | null
}

export type CampaignHealthInput = {
  status: string
  /** YYYY-MM-DD; null while unscheduled. */
  startsOn: string | null
  endsOn: string | null
  /** YYYY-MM-DD, Nairobi calendar day. */
  today: string
  hasCreative: boolean
  /** Fraction of scheduled plays delivered; null with no delivery rows. */
  deliveryRate: number | null
  daysIntoFlight: number
}

function daysUntil(today: string, day: string): number {
  return Math.round((Date.parse(day) - Date.parse(today)) / 86_400_000)
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

/**
 * Spec §9.3, first match wins. The delivery rules are skipped with no delivery
 * rows, and until MIN_DAYS_TO_JUDGE_DELIVERY days into the flight.
 */
export function campaignHealth(input: CampaignHealthInput): HealthResult {
  if (input.status === "rejected" || input.status === "changes_requested") {
    return {
      level: "action_needed",
      reason: input.status === "rejected" ? "Rejected in review" : "Changes requested in review",
      nextAction: "Open the review reason",
    }
  }

  if (input.startsOn && !input.hasCreative) {
    const days = daysUntil(input.today, input.startsOn)
    if (days >= 0 && days <= CREATIVE_LEAD_DAYS) {
      return {
        level: "at_risk",
        reason:
          days === 0
            ? "Starts today with no creative"
            : `Starts in ${plural(days, "day")} with no creative`,
        nextAction: "Add creative",
      }
    }
  }

  if (input.deliveryRate !== null && input.daysIntoFlight >= MIN_DAYS_TO_JUDGE_DELIVERY) {
    const percent = Math.round(input.deliveryRate * 100)
    if (input.deliveryRate < UNDER_DELIVERY_RATE) {
      return {
        level: "at_risk",
        reason: `Delivering ${percent}% of schedule`,
        nextAction: "Contact your account manager",
      }
    }
    if (input.deliveryRate < WATCH_DELIVERY_RATE) {
      return { level: "watch", reason: `Delivering ${percent}% of schedule`, nextAction: "Monitor" }
    }
  }

  if (input.endsOn) {
    const days = daysUntil(input.today, input.endsOn)
    if (days >= 0 && days <= ENDING_SOON_DAYS) {
      return {
        level: "watch",
        reason: days === 0 ? "Ends today" : `Ends in ${plural(days, "day")}`,
        nextAction: "Extend or plan the next flight",
      }
    }
  }

  return { level: "on_track", reason: "On track", nextAction: null }
}

export const FUNDING_LEVELS = ["untracked", "healthy", "low", "short"] as const
export type FundingLevel = (typeof FUNDING_LEVELS)[number]

export type FundingStatus = {
  level: FundingLevel
  reason: string
  nextAction: string | null
}

export type FundingStatusInput = {
  hasLedgerRows: boolean
  /** Balance minus committed budget. */
  availableKes: number
  runwayDays: number | null
}

/**
 * Org-level, deliberately kept out of campaignHealth: inside it, one short
 * wallet would mark every campaign in the org and hide real delivery problems.
 * An org with no ledger rows is untracked, never short — prod orgs start at 0
 * with real budgets and may pay by invoice.
 */
export function fundingStatus(input: FundingStatusInput): FundingStatus {
  if (!input.hasLedgerRows) {
    return {
      level: "untracked",
      reason: "Funding details appear after the first top-up",
      nextAction: null,
    }
  }
  if (input.availableKes < 0) {
    return {
      level: "short",
      reason: `Short ${formatKes(-input.availableKes)}`,
      nextAction: "Top up",
    }
  }
  if (input.runwayDays !== null && input.runwayDays < LOW_RUNWAY_DAYS) {
    return {
      level: "low",
      reason: `About ${plural(input.runwayDays, "day")} of funds left at this pace`,
      nextAction: "Top up",
    }
  }
  return { level: "healthy", reason: "Funds cover current spending", nextAction: null }
}

export const ACCOUNT_BLOCKERS = [
  "rejected_repeatedly",
  "short_of_funds",
  "dormant",
  "spend_down",
] as const
export type AccountBlocker = (typeof ACCOUNT_BLOCKERS)[number]

export type AccountHealth = {
  level: "at_risk" | "healthy"
  blocker: AccountBlocker | null
  reason: string
  nextAction: string | null
}

export type AccountHealthInput = {
  /** Rejected or changes-requested campaigns in the caller's window. */
  rejectedCampaigns: number
  /** Since the latest campaign was created, or since the org was if it has none. */
  daysSinceLastCampaign: number
  /** Viewer holds `finances`. Without it the money rules are skipped. */
  hasFinances: boolean
  funding: FundingLevel | null
  spendKes: number | null
  previousSpendKes: number | null
}

export function accountHealth(input: AccountHealthInput): AccountHealth {
  if (input.rejectedCampaigns >= REPEATED_REJECTIONS) {
    return {
      level: "at_risk",
      blocker: "rejected_repeatedly",
      reason: `${plural(input.rejectedCampaigns, "campaign")} sent back in review`,
      nextAction: "Review their creative with them",
    }
  }
  if (input.hasFinances && input.funding === "short") {
    return {
      level: "at_risk",
      blocker: "short_of_funds",
      reason: "Short of funds",
      nextAction: "Ask them to top up",
    }
  }
  if (input.daysSinceLastCampaign >= DORMANT_DAYS) {
    return {
      level: "at_risk",
      blocker: "dormant",
      reason: `No campaign in ${input.daysSinceLastCampaign} days`,
      nextAction: "Check in about their next campaign",
    }
  }
  if (
    input.hasFinances &&
    input.spendKes !== null &&
    input.previousSpendKes !== null &&
    input.previousSpendKes > 0 &&
    input.spendKes < input.previousSpendKes * (1 - SPEND_DOWN_SHARE)
  ) {
    const drop = Math.round((1 - input.spendKes / input.previousSpendKes) * 100)
    return {
      level: "at_risk",
      blocker: "spend_down",
      reason: `Spend down ${drop}% on the previous period`,
      nextAction: "Check in on their plans",
    }
  }
  return { level: "healthy", blocker: null, reason: "No blockers", nextAction: null }
}

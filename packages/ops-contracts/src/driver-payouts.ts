import type { DriverPayoutDto, DriverPayoutsDto, DriverProfileDto } from "./types"

/** The three stops every payout travels. Failed/reversed stop the route at a stage. */
export const PAYOUT_STAGES = ["Saved", "Sending", "Paid"] as const

export const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending: "Saved",
  processing: "Sending",
  settled: "Paid",
  failed: "Didn't go through",
  reversed: "Reversed",
}

export type PayoutFocus =
  | { kind: "none" }
  | {
      kind: "in_flight" | "paid" | "problem"
      payout: DriverPayoutDto
      /** Index into PAYOUT_STAGES the payout has reached (or stopped at). */
      stage: 0 | 1 | 2
    }

/**
 * Which payout the driver's home screen leads with: the newest one, whatever
 * its state. Items arrive newest period first (GET /v1/driver/payouts), so a
 * failed payout stays in focus until a newer month replaces it, and a paid
 * one stays until the next is saved.
 */
export function payoutFocus(data: DriverPayoutsDto): PayoutFocus {
  const payout = data.items[0]
  if (!payout) return { kind: "none" }
  switch (payout.status) {
    case "pending":
      return { kind: "in_flight", payout, stage: 0 }
    case "processing":
      return { kind: "in_flight", payout, stage: 1 }
    case "settled":
      return { kind: "paid", payout, stage: 2 }
    case "reversed":
      return { kind: "problem", payout, stage: 2 }
    default:
      // failed, or a status this client doesn't know yet: never show it as fine.
      return { kind: "problem", payout, stage: 1 }
  }
}

/** "M-Pesa ••• 4521" / "KCB ••• 9012", or null when the profile has no payout details. */
export function payoutDestinationLabel(
  profile: Pick<
    DriverProfileDto,
    "payout_method" | "payout_mpesa_msisdn" | "payout_bank_name" | "payout_bank_account"
  >,
): string | null {
  const tail = (value: string | null) => (value && value.length >= 4 ? `••• ${value.slice(-4)}` : null)
  if (profile.payout_method === "mpesa") {
    const t = tail(profile.payout_mpesa_msisdn)
    return t ? `M-Pesa ${t}` : "M-Pesa"
  }
  if (profile.payout_method === "bank") {
    const t = tail(profile.payout_bank_account)
    return [profile.payout_bank_name ?? "Bank", t].filter(Boolean).join(" ")
  }
  return null
}

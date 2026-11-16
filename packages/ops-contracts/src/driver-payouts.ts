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

/**
 * A driver's payouts grouped by calendar year (newest year first, rows in the order given), with what
 * actually reached them: only `settled` counts as paid, never pending, failed or reversed.
 */
export function groupPayoutsByYear(items: DriverPayoutDto[]): { year: string; paidKes: number; items: DriverPayoutDto[] }[] {
  const groups = new Map<string, { year: string; paidKes: number; items: DriverPayoutDto[] }>()
  for (const item of items) {
    const year = item.periodMonth.slice(0, 4)
    const group = groups.get(year) ?? { year, paidKes: 0, items: [] }
    group.items.push(item)
    if (item.status === "settled") group.paidKes += item.amountKes
    groups.set(year, group)
  }
  return [...groups.values()].sort((a, b) => b.year.localeCompare(a.year))
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthShort = (periodMonth: string) => MONTH_SHORT[Number(periodMonth.slice(5, 7)) - 1] ?? periodMonth

/**
 * One bar per payout month, oldest to newest, at most the latest twelve, stacked by where the money is:
 * `paid` (settled), `onItsWay` (pending or sending) and `failed` (failed or reversed).
 */
export function payoutMonthBars(items: DriverPayoutDto[]): { label: string; segments: { key: "paid" | "onItsWay" | "failed"; value: number }[] }[] {
  return [...items]
    .sort((a, b) => a.periodMonth.localeCompare(b.periodMonth))
    .slice(-12)
    .map((p) => ({
      label: monthShort(p.periodMonth),
      segments: [
        { key: "paid" as const, value: p.status === "settled" ? p.amountKes : 0 },
        { key: "onItsWay" as const, value: p.status === "pending" || p.status === "processing" ? p.amountKes : 0 },
        { key: "failed" as const, value: p.status === "failed" || p.status === "reversed" ? p.amountKes : 0 },
      ],
    }))
}

/** The chart's point in one sentence, from money that actually arrived. Nothing to say until two paid months exist. */
export function payoutTakeaway(items: DriverPayoutDto[]): string | undefined {
  const paid = items.filter((p) => p.status === "settled")
  if (paid.length < 2) return undefined
  const best = paid.reduce((top, p) => (p.amountKes > top.amountKes ? p : top))
  return `${monthShort(best.periodMonth)} ${best.periodMonth.slice(0, 4)} was your best month so far: KES ${best.amountKes.toLocaleString("en-KE", { maximumFractionDigits: 2 })}.`
}

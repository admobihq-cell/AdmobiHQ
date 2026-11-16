/**
 * The wording and checks around sending driver payouts, shared by ops web and ops-mobile. Disburse moves
 * real money out of the Paystack balance, so the receipt title and the "is there enough?" rule are
 * defined once, here, and tested.
 */

export type DisburseBatchItem = { id: number; name: string; amountKes: number; feeKes: number }

export type DisburseOutcome = {
  /** Rows the API accepted: these are the ones that moved money. */
  sent: DisburseBatchItem[]
  /** Rows the API refused, with its reason. No money moved for these. */
  skipped: { name: string; reason: string }[]
  totalKes: number
  feesKes: number
}

/** Splits a batch by the API's answer. Totals count only what was sent. */
export function settleDisburse(
  batch: readonly DisburseBatchItem[],
  result: { skipped: readonly { id: number; reason: string }[] },
): DisburseOutcome {
  const reasons = new Map(result.skipped.map((s) => [s.id, s.reason]))
  const sent = batch.filter((b) => !reasons.has(b.id))
  const skipped = batch.filter((b) => reasons.has(b.id)).map((b) => ({ name: b.name, reason: reasons.get(b.id)! }))
  return {
    sent,
    skipped,
    totalKes: sent.reduce((sum, r) => sum + r.amountKes, 0),
    feesKes: sent.reduce((sum, r) => sum + r.feeKes, 0),
  }
}

/** Never "Payouts sent" unless every row went; "Nothing was sent" when no money moved at all. */
export function disburseReceiptTitle(outcome: { sent: readonly unknown[]; skipped: readonly unknown[] }): string {
  if (outcome.sent.length === 0) return "Nothing was sent"
  return outcome.skipped.length > 0 ? "Some payouts weren’t sent" : "Payouts sent"
}

export type BalanceCheck =
  | { state: "ok"; requiredKes: number }
  | { state: "short"; requiredKes: number; shortByKes: number }
  | { state: "unavailable"; requiredKes: number }

/**
 * Whether the live Paystack balance covers the payouts plus their estimated fees. An unreadable balance
 * (`null`) pauses sending rather than guessing; a balance of exactly the requirement is enough.
 */
export function disburseBalanceCheck(balanceKes: number | null, totalKes: number, feesKes: number): BalanceCheck {
  const requiredKes = totalKes + feesKes
  if (balanceKes === null) return { state: "unavailable", requiredKes }
  if (balanceKes < requiredKes) return { state: "short", requiredKes, shortByKes: requiredKes - balanceKes }
  return { state: "ok", requiredKes }
}

/** The `{ balanceKes, requiredKes }` the API sends with a 402 when the balance is too low, or null. */
export function parseBalanceShortBody(body: unknown): { balanceKes: number; requiredKes: number } | null {
  if (typeof body !== "object" || body === null) return null
  const { balanceKes, requiredKes } = body as Record<string, unknown>
  return typeof balanceKes === "number" &&
    Number.isFinite(balanceKes) &&
    typeof requiredKes === "number" &&
    Number.isFinite(requiredKes)
    ? { balanceKes, requiredKes }
    : null
}

/** "2026-12" plus one month is "2027-01"; negative steps go back. Months are `YYYY-MM`. */
export function shiftMonth(month: string, by: number): string {
  const year = Number(month.slice(0, 4))
  const index = Number(month.slice(5, 7)) - 1 + by
  const y = year + Math.floor(index / 12)
  const m = ((index % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, "0")}`
}

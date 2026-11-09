/**
 * Constants shared by the finance queries and the finance screens. Kept apart from finance.ts,
 * which imports the database pool and must never end up in a browser bundle.
 */

/** "Deleted organization" and "No campaign" keep a ledger row visible when its owner is gone. */
export const DELETED_ORG = "Deleted organization"
export const NO_CAMPAIGN = "No campaign"

/** A wallet with no activity for this long is shown as inactive. */
export const INACTIVE_AFTER_DAYS = 60

/** One set of payout status words for the Payouts tab and the payout run dialog. */
const PAYOUT_STATUS: Record<string, { label: string; tone: "good" | "warning" | "serious" | "neutral" }> = {
  settled: { label: "Settled", tone: "good" },
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Sending", tone: "neutral" },
  failed: { label: "Failed", tone: "serious" },
  reversed: { label: "Reversed", tone: "serious" },
}
export const payoutStatus = (status: string) => PAYOUT_STATUS[status] ?? { label: status, tone: "neutral" as const }

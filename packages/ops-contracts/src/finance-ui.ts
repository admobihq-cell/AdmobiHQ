import type { StatusTone } from "./analytics"
import type { WalletStatus } from "./ops-dashboards"
import { recordTransactionSchema, type RecordTransactionInput } from "./schemas"
import type { WalletTransactionKind } from "./analytics"

/**
 * Wording and form rules for the ops Finances screens, shared by ops web and ops-mobile so the two
 * can't disagree. These are money screens: a rule or sentence changes here, once.
 */

export const NO_LEDGER = "Transactions appear here once an advertiser's wallet has activity."

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-11" → "Nov 26". A malformed month comes back readable rather than "undefined". */
export const monthLabel = (month: string): string => `${MONTHS[Number(month.slice(5)) - 1] ?? month} ${month.slice(2, 4)}`

export const LEDGER_KIND_LABEL: Record<WalletTransactionKind, string> = {
  top_up: "Top-up",
  spend: "Spend",
  refund: "Refund",
  adjustment: "Adjustment",
  cash_refund: "Refund to payer",
}

export const LEDGER_KIND_HELP: Record<WalletTransactionKind, string> = {
  top_up: "Money the advertiser paid in. Enter a positive amount.",
  spend: "A charge against a campaign. Enter a positive amount; it is recorded as a debit.",
  refund: "Money returned to the wallet. Enter a positive amount.",
  adjustment: "A correction. Enter a negative amount to take money out, or a positive one to add it.",
  cash_refund: "Money sent back to the payer (e.g. a bank refund). Enter a positive amount; it is recorded as a debit.",
}

/** The Ledger tab's filter chips, "All" first. The plural words differ from the kind labels on purpose. */
export const LEDGER_FILTERS: { value: "all" | WalletTransactionKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "top_up", label: "Top-ups" },
  { value: "spend", label: "Spend" },
  { value: "refund", label: "Refunds" },
  { value: "adjustment", label: "Adjustments" },
  { value: "cash_refund", label: "Refunds to payer" },
]

export const WALLET_STATUS_VIEW: Record<WalletStatus, { label: string; tone: StatusTone }> = {
  short: { label: "Short of funds", tone: "serious" },
  healthy: { label: "Healthy", tone: "good" },
  inactive: { label: "Inactive", tone: "neutral" },
}

export const WALLET_FILTERS: { value: "all" | WalletStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "short", label: "Short of funds" },
  { value: "healthy", label: "Healthy" },
  { value: "inactive", label: "Inactive" },
]

/** Net margin as a share of revenue, or an honest "No revenue yet". */
export const netMarginNote = (netMarginKes: number, revenueKes: number): string =>
  revenueKes > 0 ? `${Math.round((netMarginKes / revenueKes) * 100)}% of revenue` : "No revenue yet"

/**
 * What is wrong with a refund form, in the order the form shows its fields, or null when it can be
 * sent. The API still decides (it refuses more than the org's available balance).
 */
export function refundFormError(form: { orgId: string; amount: string; reason: string }): string | null {
  if (!form.orgId) return "Choose an organization."
  if (!(Number(form.amount) > 0)) return "Enter an amount above zero."
  if (form.reason.trim().length < 3) return "Say why, for the audit trail (the support case number is enough)."
  return null
}

/**
 * The Record transaction form as the API's input, or the first thing wrong with it, in the API's own
 * words (`recordTransactionSchema` is the same schema the API checks). The ledger is append-only, so a
 * mistake is corrected with an adjustment, not an edit.
 */
export function parseRecordTransactionForm(form: {
  orgId: string
  kind: WalletTransactionKind
  amount: string
  campaignId: string | null
  category: string | null
  reference: string
  reason: string
}): { data: RecordTransactionInput } | { error: string } {
  if (!form.orgId) return { error: "Choose an organization." }
  if (!form.amount.trim() || Number.isNaN(Number(form.amount))) return { error: "Enter an amount." }

  const parsed = recordTransactionSchema.safeParse({
    orgId: Number(form.orgId),
    kind: form.kind,
    amountKes: Number(form.amount),
    campaignId: form.campaignId ? Number(form.campaignId) : undefined,
    spendCategory: form.category ?? undefined,
    reference: form.reference.trim() || undefined,
    reason: form.reason,
  })
  return parsed.success ? { data: parsed.data } : { error: parsed.error.issues[0]?.message ?? "Check the form." }
}

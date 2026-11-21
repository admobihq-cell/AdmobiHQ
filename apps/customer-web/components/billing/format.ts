import type { CustomerBillingDocumentDto, InvoiceStatus, WalletTransactionKind } from "@workspace/ops-contracts"
import type { StatusTone } from "@workspace/ui/components/dashboard/status-pill"

export const KIND_LABELS: Record<WalletTransactionKind, string> = {
  top_up: "Top-up",
  spend: "Spend",
  refund: "Refund",
  adjustment: "Adjustment",
  cash_refund: "Refund to payer",
}

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: StatusTone }> = {
  issued: { label: "Open", tone: "neutral" },
  paid: { label: "Paid", tone: "good" },
  overdue: { label: "Overdue", tone: "serious" },
  void: { label: "Void", tone: "neutral" },
}

/** Pill for a quote or invoice ops wrote by hand. Unpaid and overdue read red, as on the PDF. */
export function billingDocumentStatus(doc: CustomerBillingDocumentDto): { label: string; tone: StatusTone } {
  if (doc.status === "void") return { label: "Void", tone: "neutral" }
  if (doc.kind === "quote") {
    if (doc.status === "accepted") return { label: "Accepted", tone: "good" }
    if (doc.status === "declined") return { label: "Declined", tone: "neutral" }
    return { label: "Quote", tone: "neutral" }
  }
  switch (doc.paymentState) {
    case "paid":
      return { label: "Paid", tone: "good" }
    case "part_paid":
      return { label: "Part-paid", tone: "warning" }
    case "overdue":
      return { label: "Overdue", tone: "serious" }
    default:
      return { label: "Unpaid", tone: "serious" }
  }
}

/** "3 Nov 2026", in Nairobi time. Accepts an ISO timestamp or a plain YYYY-MM-DD day. */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value)
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  })
}

/** A signed amount for a ledger: credits read "+KES 500", debits "-KES 500". */
export function signedKes(value: number, format: (n: number) => string): string {
  return `${value > 0 ? "+" : ""}${format(value)}`
}

import type { BillingDocumentKind, BillingDocumentStatus, BillingPaymentState } from "@workspace/ops-contracts"
import type { StatusTone } from "@workspace/ui/components/dashboard/status-pill"

/** One label and tone per document state, shared by the list tab and the editor.
 * Unpaid and overdue invoices read red, as on the PDF. */
export function billingPillProps(doc: {
  kind: BillingDocumentKind
  status: BillingDocumentStatus
  paymentState: BillingPaymentState | null
}): { label: string; tone: StatusTone } {
  if (doc.status === "draft") return { label: "Draft", tone: "neutral" }
  if (doc.status === "void") return { label: "Void", tone: "neutral" }
  if (doc.kind === "quote") {
    if (doc.status === "accepted") return { label: "Accepted", tone: "good" }
    if (doc.status === "declined") return { label: "Declined", tone: "neutral" }
    return { label: "Sent", tone: "warning" }
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

const dayFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

/** "21 Nov 2026" from a plain YYYY-MM-DD day (no timezone shift). */
export function formatDay(isoDay: string): string {
  return dayFormat.format(new Date(`${isoDay}T00:00:00Z`))
}

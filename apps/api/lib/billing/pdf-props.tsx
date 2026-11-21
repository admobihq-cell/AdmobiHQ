import { NextResponse } from "next/server"

import {
  computeBillingTotals,
  exportFileName,
  type BillingDocumentInput,
  type BillingDocumentKind,
  type BillingDocumentStatus,
  type BillingPaymentState,
} from "@workspace/ops-contracts"

import { latin1 } from "@/lib/pdf/latin1"
import { renderPdf } from "@/lib/pdf/render-pdf"
import {
  BILLING_PDF_FOOTER,
  BillingDocumentPdf,
  type BillingDocumentPdfProps,
  type PdfPill,
} from "@/lib/pdf/templates/billing-document-pdf"

/** The status pill printed under the number. Quotes in flight carry none. */
export function pillFor(
  kind: BillingDocumentKind,
  status: BillingDocumentStatus,
  state: BillingPaymentState | null
): PdfPill | null {
  if (status === "draft") return { label: "DRAFT", tone: "grey" }
  if (status === "void") return { label: "VOID", tone: "grey" }
  if (kind === "quote") return null
  switch (state) {
    case "paid":
      return { label: "PAID", tone: "green" }
    case "part_paid":
      return { label: "PART-PAID", tone: "amber" }
    case "overdue":
      return { label: "OVERDUE", tone: "red" }
    default:
      return { label: "UNPAID", tone: "red" }
  }
}

type PdfSource = BillingDocumentInput & {
  number: string | null
  status: BillingDocumentStatus
  campaignName: string | null
  paidKes: number
  paymentState: BillingPaymentState | null
}

/** Saved document or unsaved editor state → template props. Every string goes through latin1(). */
export function toBillingPdfProps(doc: PdfSource): BillingDocumentPdfProps {
  const totals = computeBillingTotals(doc)
  const showPaid = doc.kind === "invoice" && doc.paidKes > 0
  return {
    kind: doc.kind,
    number: doc.number ? latin1(doc.number) : null,
    pill: pillFor(doc.kind, doc.status, doc.paymentState),
    customer: {
      name: latin1(doc.customer.name),
      contact: latin1(doc.customer.contact),
      email: latin1(doc.customer.email),
      phone: latin1(doc.customer.phone),
      address: latin1(doc.customer.address),
      taxPin: latin1(doc.customer.taxPin),
    },
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    reference: latin1(doc.reference),
    campaignName: doc.campaignName ? latin1(doc.campaignName) : null,
    lines: doc.lines.map((line, i) => ({
      description: latin1(line.description),
      unit: latin1(line.unit),
      quantity: line.quantity,
      unitPriceKes: line.unitPriceKes,
      amountKes: totals.lineAmounts[i]!,
    })),
    subtotalKes: totals.subtotalKes,
    discountPct: doc.discountPct,
    discountKes: totals.discountKes,
    taxPct: doc.taxPct,
    taxKes: totals.taxKes,
    feeLabel: latin1(doc.feeLabel),
    feeKes: totals.feeKes,
    totalKes: totals.totalKes,
    paidKes: showPaid ? doc.paidKes : null,
    balanceKes: showPaid ? Math.round(Math.max(totals.totalKes - doc.paidKes, 0) * 100) / 100 : null,
    note: latin1(doc.note),
    paymentInstructions: latin1(doc.paymentInstructions),
    terms: latin1(doc.terms),
  }
}

/**
 * What the editor's live preview renders. A saved document that is no longer a
 * draft is fixed, so it renders from the saved copy and the request body is
 * ignored — otherwise its real number and PAID pill could be printed over
 * made-up lines. A draft (or unsaved form) renders the body, with the saved
 * number and payments when there is one.
 */
export function previewPdfProps(
  body: BillingDocumentInput,
  saved: PdfSource | null,
  campaignName: string | null
): BillingDocumentPdfProps {
  if (saved && saved.status !== "draft") return toBillingPdfProps(saved)
  return toBillingPdfProps({
    ...body,
    kind: saved?.kind ?? body.kind,
    number: saved?.number ?? null,
    status: "draft",
    campaignName,
    paidKes: saved?.paidKes ?? 0,
    paymentState: null,
  })
}

/** PDF bytes for a document, with the customer-facing footer. */
export function renderBillingDocumentPdf(props: BillingDocumentPdfProps): Promise<Uint8Array> {
  const label = props.kind === "quote" ? "Quote" : "Invoice"
  return renderPdf(<BillingDocumentPdf {...props} />, {
    footer: BILLING_PDF_FOOTER,
    metadata: {
      title: `Admobi - ${label} ${props.number ?? "draft"}`,
      authors: ["Admobi"],
      creationDate: new Date().toISOString().slice(0, 10),
    },
  })
}

/** `attachment` for downloads, `inline` for the editor preview. */
export function pdfResponse(bytes: Uint8Array, kind: BillingDocumentKind, number: string | null, disposition: "attachment" | "inline") {
  const filename = exportFileName(kind, (number ?? "draft").replaceAll("/", "-"), "pdf")
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

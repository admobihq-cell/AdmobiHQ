import { exportFileName, type BillingDocumentDto, type BillingSendOutcome } from "@workspace/ops-contracts"

import { renderBillingDocumentPdf, toBillingPdfProps } from "@/lib/billing/pdf-props"
import { renderTemplate } from "@/lib/email/render-template"
import { sendEmail } from "@/lib/email/send-email"
import { BillingDocumentSent } from "@/lib/email/templates/BillingDocumentSent"

export type DocumentEmailOutcome = Required<BillingSendOutcome>

const dueFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

/**
 * Emails a just-sent quote or invoice, PDF attached, to the customer address
 * on the document (the org's billing email, or what ops typed for a prospect).
 * Never throws: the document is already sent, so a mail problem is reported
 * back to ops instead of undoing anything.
 */
export async function emailBillingDocument(doc: BillingDocumentDto): Promise<DocumentEmailOutcome> {
  const to = doc.customer.email.trim()
  if (!to) return { emailedTo: null, emailError: "No email address on this document, so nothing was emailed." }

  try {
    const pdf = await renderBillingDocumentPdf(toBillingPdfProps(doc))
    const html = await renderTemplate(BillingDocumentSent, {
      kind: doc.kind,
      number: doc.number,
      customerName: doc.customer.contact || doc.customer.name,
      totalKes: doc.totalKes,
      dueLabel: dueFormat.format(new Date(`${doc.dueDate}T00:00:00Z`)),
      campaignName: doc.campaignName,
      hasAccount: doc.orgId !== null,
    })
    const label = doc.kind === "quote" ? "Quotation" : "Invoice"
    await sendEmail(to, `${label} ${doc.number} from Admobi`, html, {
      attachments: [
        { filename: exportFileName(doc.kind, doc.number.replaceAll("/", "-"), "pdf"), content: Buffer.from(pdf).toString("base64") },
      ],
    })
    return { emailedTo: to, emailError: null }
  } catch (error: unknown) {
    console.error("[billing] Failed to email document", doc.number, error)
    return { emailedTo: null, emailError: `Sent, but we couldn't email it to ${to}. Download the PDF and send it yourself.` }
  }
}

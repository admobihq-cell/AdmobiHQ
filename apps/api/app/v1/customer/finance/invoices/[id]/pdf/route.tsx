import { getInvoice } from "@/lib/analytics/finance-queries"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { pdfResponse, receiptPdfProps, renderBillingDocumentPdf } from "@/lib/billing/pdf-props"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/**
 * One Paystack invoice as a PDF, in the same layout as the quotes and invoices
 * ops writes. Another org's invoice id answers 404. Needs `billing:read`.
 */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const invoice = await getInvoice(auth.access.orgId, id)
  if (!invoice) return jsonError("Not found", 404)

  const org = await prisma.advertiserOrg.findUnique({
    where: { id: auth.access.orgId },
    select: { name: true, billing_email: true, tax_pin: true },
  })

  try {
    const props = receiptPdfProps(invoice, {
      name: org?.name ?? "",
      billingEmail: org?.billing_email ?? null,
      taxPin: org?.tax_pin ?? null,
    })
    return pdfResponse(await renderBillingDocumentPdf(props), "invoice", invoice.number, "attachment")
  } catch (error: unknown) {
    console.error("[customer /v1/customer/finance/invoices/[id]/pdf GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}

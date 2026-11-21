import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { getCustomerBillingDocument } from "@/lib/billing/documents"
import { pdfResponse, renderBillingDocumentPdf, toBillingPdfProps } from "@/lib/billing/pdf-props"

type Params = { params: Promise<{ id: string }> }

/** One sent quote or invoice as a PDF. Another org's document or a draft answers 404. Needs `billing:read`. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const doc = await getCustomerBillingDocument(auth.access.orgId, id)
  if (!doc) return jsonError("Not found", 404)

  try {
    return pdfResponse(await renderBillingDocumentPdf(toBillingPdfProps(doc)), doc.kind, doc.number, "attachment")
  } catch (error: unknown) {
    console.error("[customer /v1/customer/finance/documents/[id]/pdf GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}

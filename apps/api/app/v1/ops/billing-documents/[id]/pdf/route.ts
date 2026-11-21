import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { getBillingDocument } from "@/lib/billing/documents"
import { pdfResponse, renderBillingDocumentPdf, toBillingPdfProps } from "@/lib/billing/pdf-props"

type Params = { params: Promise<{ id: string }> }

/** A saved quote or invoice as a PDF download, in any status. Needs `finances`. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const doc = await getBillingDocument(id)
  if (!doc) return jsonError("Not found", 404)

  try {
    return pdfResponse(await renderBillingDocumentPdf(toBillingPdfProps(doc)), doc.kind, doc.number, "attachment")
  } catch (error: unknown) {
    console.error("[ops /v1/ops/billing-documents/[id]/pdf GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}

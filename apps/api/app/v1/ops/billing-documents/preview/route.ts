import { z } from "zod"

import { billingDocumentInputSchema } from "@workspace/ops-contracts"

import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { getBillingDocument } from "@/lib/billing/documents"
import { pdfResponse, renderBillingDocumentPdf, toBillingPdfProps } from "@/lib/billing/pdf-props"
import { prisma } from "@/lib/prisma"

const previewSchema = z.object({
  id: z.number().int().positive().optional(),
  document: billingDocumentInputSchema,
})

/**
 * The editor's live preview: unsaved form state → PDF, inline. Writes nothing.
 * With `id`, the saved number, status and payments are used so the preview
 * shows the real pill; without it the document is an unnumbered draft.
 * Needs `finances`.
 */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, previewSchema)
  if ("error" in parsed) return parsed.error
  const { id, document } = parsed.data

  const saved = id ? await getBillingDocument(id) : null
  if (id && !saved) return jsonError("Not found", 404)

  const campaign = document.campaignId
    ? await prisma.campaign.findUnique({ where: { id: document.campaignId }, select: { name: true } })
    : null

  const props = toBillingPdfProps({
    ...document,
    kind: saved?.kind ?? document.kind,
    number: saved?.number ?? null,
    status: saved?.status ?? "draft",
    campaignName: campaign?.name ?? null,
    paidKes: saved?.paidKes ?? 0,
    paymentState: saved?.paymentState ?? null,
  })

  try {
    return pdfResponse(await renderBillingDocumentPdf(props), props.kind, props.number, "inline")
  } catch (error: unknown) {
    console.error("[ops /v1/ops/billing-documents/preview POST]", error)
    return jsonError("PDF generation failed", 500)
  }
}

import { NextResponse } from "next/server"

import { billingDocumentInputSchema, formatKes } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { assertCampaignBelongsToOrg, getBillingDocument, updateBillingDocument } from "@/lib/billing/documents"

type Params = { params: Promise<{ id: string }> }

/** One quote or invoice with its payments. Needs `finances`. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const doc = await getBillingDocument(id)
  return doc ? NextResponse.json(doc) : jsonError("Not found", 404)
}

/** Edit a draft. Sent documents are locked: void and re-issue instead. Needs `finances`. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, billingDocumentInputSchema)
  if ("error" in parsed) return parsed.error

  const campaignError = await assertCampaignBelongsToOrg(parsed.data.orgId, parsed.data.campaignId)
  if (campaignError) return jsonError(campaignError, 400)

  const result = await updateBillingDocument(id, parsed.data)
  if (result === "not_found") return jsonError("Not found", 404)
  if (result === "locked") return jsonError("Only drafts can be edited", 409)

  await auditFromOpsUser(auth.access, {
    action: "billing_document.updated",
    entity_type: "billing_document",
    entity_id: result.id,
    org_id: result.orgId,
    summary: `Edited ${result.kind} ${result.number} (${formatKes(result.totalKes)})`,
  })
  return NextResponse.json(result)
}

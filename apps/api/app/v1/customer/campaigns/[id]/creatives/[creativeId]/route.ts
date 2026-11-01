import { NextResponse } from "next/server"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaigns/campaign-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; creativeId: string }> }

/** Detaches the creative from this campaign. The file itself stays in the
 * org's Media Library — it may be on other campaigns, and deleting it is a
 * library action (DELETE /v1/customer/media/:id). */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("creatives:write")
  if (auth.error) return auth.error

  const { id: rawId, creativeId: rawCreativeId } = await params
  const id = parseId(rawId)
  const creativeId = parseId(rawCreativeId)
  if (!id || !creativeId) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Creative can't be changed while status is "${campaign.status}"`, 409)
  }

  const creative = campaign.creatives.find((c) => c.id === creativeId)
  if (!creative) return jsonError("Not found", 404)

  await prisma.campaignCreative.delete({ where: { id: creativeId } })

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "campaign_creative",
    entity_id: creativeId,
    summary: `Campaign #${id} creative removed`,
  })

  return NextResponse.json({ success: true })
}

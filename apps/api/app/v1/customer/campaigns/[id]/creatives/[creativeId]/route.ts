import { NextResponse } from "next/server"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { destroyCampaignCreative } from "@/lib/campaign-creative-storage"
import { EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaign-store"
import type { PrivateResourceType } from "@/lib/private-media"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; creativeId: string }> }

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
  await destroyCampaignCreative(
    creative.cloudinary_public_id,
    creative.resource_type as PrivateResourceType,
  )

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "campaign_creative",
    entity_id: creativeId,
    summary: `Campaign #${id} creative removed`,
  })

  return NextResponse.json({ success: true })
}

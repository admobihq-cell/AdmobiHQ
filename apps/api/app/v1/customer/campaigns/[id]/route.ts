import { NextResponse } from "next/server"

import { campaignUpdateSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireCustomerAccess } from "@/lib/api-utils"
import { toCampaignDto, toDayIso } from "@/lib/campaign-dto"
import { destroyCampaignCreative } from "@/lib/campaign-creative-storage"
import { EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaign-store"
import type { PrivateResourceType } from "@/lib/private-media"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.userId, id)
  if (!campaign) return jsonError("Not found", 404)

  return NextResponse.json(toCampaignDto(campaign))
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.userId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Campaign can't be edited while status is "${campaign.status}"`, 409)
  }

  const parsed = await parseJsonBody(req, campaignUpdateSchema)
  if ("error" in parsed) return parsed.error
  const { starts_on, ends_on, ...rest } = parsed.data

  // A half-open window is only valid across a whole record: the schema can't
  // catch "PATCH ends_on earlier than the starts_on already in the row", so
  // check the merged result here.
  const nextStart =
    starts_on !== undefined ? starts_on : campaign.starts_on && toDayIso(campaign.starts_on)
  const nextEnd = ends_on !== undefined ? ends_on : campaign.ends_on && toDayIso(campaign.ends_on)
  if (nextStart && nextEnd && nextEnd < nextStart) {
    return jsonError("The flight can't end before it starts", 400)
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      ...rest,
      ...(starts_on !== undefined
        ? { starts_on: starts_on ? new Date(`${starts_on}T00:00:00Z`) : null }
        : {}),
      ...(ends_on !== undefined
        ? { ends_on: ends_on ? new Date(`${ends_on}T00:00:00Z`) : null }
        : {}),
    },
    include: { creatives: { orderBy: { created_at: "asc" } } },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "campaign",
    entity_id: id,
    summary: `Campaign #${id} "${updated.name}" updated`,
  })

  return NextResponse.json(toCampaignDto(updated))
}

/** Drafts only. Anything that has been submitted is part of the review record,
 * so it is cancelled (a status change) rather than erased. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.userId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (campaign.status !== "draft") {
    return jsonError(`Only a draft can be deleted — this one is "${campaign.status}"`, 409)
  }

  // Cloudinary first: the DB row is the only record of the public_id, so
  // deleting it first would orphan the asset with no way to find it again.
  for (const creative of campaign.creatives) {
    await destroyCampaignCreative(
      creative.cloudinary_public_id,
      creative.resource_type as PrivateResourceType,
    )
  }
  await prisma.campaign.delete({ where: { id } })

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "campaign",
    entity_id: id,
    summary: `Campaign #${id} "${campaign.name}" deleted`,
  })

  return NextResponse.json({ success: true })
}

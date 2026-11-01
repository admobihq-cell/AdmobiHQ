import { NextResponse } from "next/server"

import {
  campaignCreativeSlotSchema,
  checkCreativeForFormat,
  specsForFormat,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import {
  MAX_CREATIVES_PER_CAMPAIGN,
  destroyCampaignCreative,
} from "@/lib/campaigns/campaign-creative-storage"
import { toCampaignCreativeDto } from "@/lib/campaigns/campaign-dto"
import { EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaigns/campaign-store"
import { mediaAssetCreateData, storeCreativeFile } from "@/lib/campaigns/media-asset-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/** Whether a file fits this campaign's panel(s). Dimensions come from
 * Cloudinary's upload response — the only trustworthy source; a client-side
 * check is a convenience, not a gate. A file with no readable dimensions is
 * let through, as it always has been. */
function checkAgainstFormat(format: CampaignFormat, width: number | null, height: number | null) {
  return width != null && height != null
    ? checkCreativeForFormat(format, width, height)
    : { level: "ok" as const, ok: true, message: undefined }
}

function formatMismatch(format: CampaignFormat, message: string | undefined) {
  return jsonError(message ?? "Creative doesn't match the panel", 400, {
    specs: specsForFormat(format).map((spec) => ({
      format: spec.format,
      label: spec.label,
      aspect: spec.aspectLabel,
      width: spec.recommendedWidthPx,
      height: spec.recommendedHeightPx,
    })),
  })
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("creatives:write")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Creative can't be changed while status is "${campaign.status}"`, 409)
  }
  if (campaign.creatives.length >= MAX_CREATIVES_PER_CAMPAIGN) {
    return jsonError(`A campaign can hold at most ${MAX_CREATIVES_PER_CAMPAIGN} creatives`, 400)
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return jsonError("Missing file", 400)

  const slotParsed = campaignCreativeSlotSchema.safeParse(form?.get("slot") ?? "all")
  if (!slotParsed.success) return jsonError("Invalid slot", 400)

  const result = await storeCreativeFile(auth.access.orgId, file)
  if (result.error) return result.error
  const { stored } = result

  const format = campaign.format as CampaignFormat
  const check = checkAgainstFormat(format, stored.uploaded.width, stored.uploaded.height)
  if (!check.ok) {
    // Roll the upload back: the advertiser picked this file for this campaign,
    // so a file that can't run here shouldn't be left sitting in their library.
    await destroyCampaignCreative(stored.uploaded.publicId, stored.resourceType)
    return formatMismatch(format, check.message)
  }

  const created = await prisma.campaignCreative.create({
    data: {
      campaign: { connect: { id: campaign.id } },
      slot: slotParsed.data,
      // Every upload lands in the org's Media Library, so it can be reused on
      // another campaign without uploading it again.
      media_asset: {
        create: mediaAssetCreateData({
          orgId: auth.access.orgId,
          userId: auth.access.userId,
          file,
          stored,
        }),
      },
    },
    include: { media_asset: true },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "campaign_creative",
    entity_id: created.id,
    summary: `Campaign #${campaign.id} creative uploaded (${stored.resourceType})`,
  })

  return NextResponse.json(
    // A "warn" is not a failure — the creative is saved and the UI surfaces
    // the note so the advertiser can decide whether to replace it.
    { ...toCampaignCreativeDto(created), warning: check.level === "warn" ? check.message : null },
    { status: 201 },
  )
}

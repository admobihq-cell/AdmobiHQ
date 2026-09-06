import { NextResponse } from "next/server"

import {
  CREATIVE_FORMATS_LABEL,
  campaignCreativeSlotSchema,
  checkCreativeForFormat,
  specsForFormat,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerAccess } from "@/lib/api-utils"
import {
  MAX_CREATIVES_PER_CAMPAIGN,
  MAX_CREATIVE_BYTES,
  buildCampaignCreativePublicId,
  destroyCampaignCreative,
  resourceTypeForMime,
  uploadCampaignCreative,
} from "@/lib/campaign-creative-storage"
import { toCampaignCreativeDto } from "@/lib/campaign-dto"
import { EDITABLE_STATUSES, getOwnedCampaign } from "@/lib/campaign-store"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.userId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Creative can't be changed while status is "${campaign.status}"`, 409)
  }
  if (campaign.creatives.length >= MAX_CREATIVES_PER_CAMPAIGN) {
    return jsonError(`A campaign can hold at most ${MAX_CREATIVES_PER_CAMPAIGN} creatives`, 400)
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return jsonError("Missing file", 400)

  const slotParsed = campaignCreativeSlotSchema.safeParse(form.get("slot") ?? "all")
  if (!slotParsed.success) return jsonError("Invalid slot", 400)

  // The supplier's player decodes PNG, JPG, GIF and MP4 and nothing else.
  // Accepting anything wider would let creative pass ops review and then fail
  // silently on the vehicle.
  const resourceType = resourceTypeForMime(file.type)
  if (!resourceType) {
    return jsonError(`Creative must be ${CREATIVE_FORMATS_LABEL}`, 400)
  }
  if (file.size > MAX_CREATIVE_BYTES) {
    return jsonError(`Creative must be under ${Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)}MB`, 400)
  }

  const publicId = buildCampaignCreativePublicId(campaign.id, crypto.randomUUID())
  const uploaded = await uploadCampaignCreative(file, publicId, resourceType)

  // Dimensions are checked AFTER upload because Cloudinary's response is the
  // only trustworthy source for them — a client-side check is a convenience,
  // not a gate.
  const format = campaign.format as CampaignFormat
  const check =
    uploaded.width != null && uploaded.height != null
      ? checkCreativeForFormat(format, uploaded.width, uploaded.height)
      : { level: "ok" as const, ok: true, message: undefined }

  if (!check.ok) {
    // Roll the upload back rather than leaving an asset the DB has no row for
    // and therefore no way to ever find again.
    await destroyCampaignCreative(publicId, resourceType)
    return jsonError(check.message ?? "Creative doesn't match the panel", 400, {
      specs: specsForFormat(format).map((spec) => ({
        format: spec.format,
        label: spec.label,
        aspect: spec.aspectLabel,
        width: spec.recommendedWidthPx,
        height: spec.recommendedHeightPx,
      })),
    })
  }

  const created = await prisma.campaignCreative.create({
    data: {
      campaign_id: campaign.id,
      resource_type: resourceType,
      cloudinary_public_id: uploaded.publicId,
      content_type: uploaded.contentType,
      size_bytes: uploaded.sizeBytes,
      width: uploaded.width,
      height: uploaded.height,
      duration_seconds: uploaded.durationSeconds,
      original_filename: file.name || null,
      slot: slotParsed.data,
    },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "campaign_creative",
    entity_id: created.id,
    summary: `Campaign #${campaign.id} creative uploaded (${resourceType})`,
  })

  return NextResponse.json(
    // A "warn" is not a failure — the creative is saved and the UI surfaces
    // the note so the advertiser can decide whether to replace it.
    { ...toCampaignCreativeDto(created), warning: check.level === "warn" ? check.message : null },
    { status: 201 },
  )
}

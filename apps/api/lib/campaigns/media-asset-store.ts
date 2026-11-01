import type { MediaAsset } from "@prisma/client"
import type { NextResponse } from "next/server"

import {
  CREATIVE_FORMATS_LABEL,
  MEDIA_ASSET_NAME_MAX,
  type MediaAssetDto,
} from "@workspace/ops-contracts"

import { jsonError } from "@/lib/api-utils"
import {
  MAX_CREATIVE_BYTES,
  buildMediaAssetPublicId,
  resourceTypeForMime,
  uploadCampaignCreative,
} from "@/lib/campaigns/campaign-creative-storage"
import type { PrivateResourceType, UploadedAsset } from "@/lib/storage/private-media"
import { prisma } from "@/lib/prisma"

/**
 * Media Library storage rules, shared by the two ways a file gets in: the
 * library's own upload and a campaign's inline upload. Both must accept and
 * reject exactly the same files.
 */

export type StoredCreativeFile = { resourceType: PrivateResourceType; uploaded: UploadedAsset }

export function defaultAssetName(filename: string | null | undefined): string {
  return (filename?.trim() || "Untitled creative").slice(0, MEDIA_ASSET_NAME_MAX)
}

/**
 * Checks the file itself (type, size) and stores it in Cloudinary. Says
 * nothing about whether it fits a panel — that depends on the campaign it is
 * attached to, and is checked there.
 */
export async function storeCreativeFile(
  orgId: number,
  file: File,
): Promise<
  | { stored: StoredCreativeFile; error?: undefined }
  | { stored?: undefined; error: NextResponse }
> {
  // The supplier's player decodes PNG, JPG, GIF and MP4 and nothing else.
  // Accepting anything wider would let creative pass ops review and then fail
  // silently on the vehicle.
  const resourceType = resourceTypeForMime(file.type)
  if (!resourceType) {
    return { error: jsonError(`Creative must be ${CREATIVE_FORMATS_LABEL}`, 400) }
  }
  if (file.size === 0) return { error: jsonError("That file is empty", 400) }
  if (file.size > MAX_CREATIVE_BYTES) {
    return {
      error: jsonError(
        `Creative must be under ${Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)}MB`,
        400,
      ),
    }
  }

  try {
    const uploaded = await uploadCampaignCreative(
      file,
      buildMediaAssetPublicId(orgId, crypto.randomUUID()),
      resourceType,
    )
    return { stored: { resourceType, uploaded } }
  } catch (error) {
    console.error("[media] upload failed:", error)
    return { error: jsonError("Upload failed — please try again", 502) }
  }
}

/** The media_assets row for a file that has just landed in Cloudinary. */
export function mediaAssetCreateData(input: {
  orgId: number
  userId: string
  file: File
  stored: StoredCreativeFile
}) {
  const { uploaded } = input.stored
  return {
    org_id: input.orgId,
    name: defaultAssetName(input.file.name),
    resource_type: input.stored.resourceType,
    cloudinary_public_id: uploaded.publicId,
    content_type: uploaded.contentType,
    size_bytes: uploaded.sizeBytes,
    // Stored eagerly: these are the fields the supplier screen API asks for,
    // and recovering them later would mean re-downloading every asset.
    width: uploaded.width,
    height: uploaded.height,
    duration_seconds: uploaded.durationSeconds,
    original_filename: input.file.name || null,
    created_by_clerk_user_id: input.userId,
  }
}

/** Which campaigns a file is on — for "used in N campaigns" and the delete guard. */
export const MEDIA_ASSET_INCLUDE = {
  attachments: { select: { campaign: { select: { id: true, name: true } } } },
} as const

export type MediaAssetWithCampaigns = MediaAsset & {
  attachments: { campaign: { id: number; name: string } }[]
}

/**
 * Returns the file only if this org owns it, and null otherwise — for both
 * "no such file" and "another org's file". Callers turn null into a 404, never
 * a 403, so nobody can enumerate the table. Same rule as getOwnedCampaign.
 */
export async function getOwnedMediaAsset(
  orgId: number,
  id: number,
): Promise<MediaAssetWithCampaigns | null> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: MEDIA_ASSET_INCLUDE,
  })
  if (!asset || asset.org_id !== orgId) return null
  return asset
}

export function toMediaAssetDto(
  asset: MediaAssetWithCampaigns,
  /** Resolved from created_by_clerk_user_id by the list route, the only reader
   * that shows it — same split as toCampaignDto's createdByName. */
  createdByName?: string | null,
): MediaAssetDto {
  // A file can sit in several slots of one campaign; people count campaigns.
  const campaigns = [
    ...new Map(asset.attachments.map((a) => [a.campaign.id, a.campaign])).values(),
  ]
  return {
    id: asset.id,
    name: asset.name,
    resource_type: asset.resource_type,
    content_type: asset.content_type,
    size_bytes: asset.size_bytes,
    width: asset.width,
    height: asset.height,
    // Prisma Decimal is not JSON-safe, so it crosses the wire as a string.
    duration_seconds: asset.duration_seconds?.toString() ?? null,
    original_filename: asset.original_filename,
    status: asset.status,
    source: asset.source,
    created_by_name: createdByName ?? null,
    created_at: asset.created_at.toISOString(),
    campaigns,
  }
}

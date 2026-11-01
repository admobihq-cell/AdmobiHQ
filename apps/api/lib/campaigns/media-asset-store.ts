import type { NextResponse } from "next/server"

import { CREATIVE_FORMATS_LABEL, MEDIA_ASSET_NAME_MAX } from "@workspace/ops-contracts"

import { jsonError } from "@/lib/api-utils"
import {
  MAX_CREATIVE_BYTES,
  buildMediaAssetPublicId,
  resourceTypeForMime,
  uploadCampaignCreative,
} from "@/lib/campaigns/campaign-creative-storage"
import type { PrivateResourceType, UploadedAsset } from "@/lib/storage/private-media"

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

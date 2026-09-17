import {
  CREATIVE_MIME_TYPES,
  MAX_CREATIVE_BYTES,
  MAX_CREATIVES_PER_CAMPAIGN,
} from "@workspace/ops-contracts"

import {
  destroyPrivateAsset,
  fetchPrivateAsset,
  uploadPrivateAsset,
  type PrivateResourceType,
} from "@/lib/private-media"

/**
 * Campaign creatives — advertiser artwork for the taxi-top (960x320mm,
 * double-sided) and delivery-bike (320x320mm P2.5, three sides) LED panels.
 * Image-or-video binding over lib/private-media.ts, the sibling of
 * lib/driver-document-storage.ts.
 *
 * The accepted format list lives in @workspace/ops-contracts so the API, both
 * advertiser upload UIs, and both ops review UIs enforce and display exactly
 * the same set. The supplier console states verbatim: "Note: Materials only
 * support PNG, JPG, GIF, MP4 format!"
 *
 * We deliberately do NOT transcode. The supplier's own upload interface has a
 * Transcoding toggle that converts MP4 into hardware-friendly profiles for
 * lag-free, battery-sane playback; re-encoding here would only degrade the
 * master we hand them.
 */

export { MAX_CREATIVE_BYTES, MAX_CREATIVES_PER_CAMPAIGN }

const IMAGE_TYPES = new Set<string>(
  CREATIVE_MIME_TYPES.filter((type) => type.startsWith("image/")),
)
const VIDEO_TYPES = new Set<string>(
  CREATIVE_MIME_TYPES.filter((type) => type.startsWith("video/")),
)

/** Cloudinary's resource_type for a given upload, or null when the mime type
 * isn't one the supplier's player can decode. Callers turn null into a 400 —
 * accepting an undecodable format would let creative pass ops review and then
 * fail silently on the vehicle. */
export function resourceTypeForMime(mimeType: string): PrivateResourceType | null {
  // Cloudinary classifies GIF (animated included) under resource_type "image".
  if (IMAGE_TYPES.has(mimeType)) return "image"
  if (VIDEO_TYPES.has(mimeType)) return "video"
  return null
}

export function buildCampaignCreativePublicId(campaignId: number, uploadId: string): string {
  return `campaign-creatives/${campaignId}/${uploadId}`
}

export function uploadCampaignCreative(
  file: File,
  publicId: string,
  resourceType: PrivateResourceType,
) {
  return uploadPrivateAsset(file, publicId, resourceType)
}

export function destroyCampaignCreative(publicId: string, resourceType: PrivateResourceType) {
  return destroyPrivateAsset(publicId, resourceType)
}

/**
 * Review/preview delivery. Images are capped at 1600px rather than the 800px
 * used for driver documents: a 960px-wide taxi-top creative would otherwise be
 * downscaled in the one view whose entire purpose is judging whether the
 * artwork is fit to run. Video and animated GIF are served untransformed by
 * private-media.
 */
export function fetchCampaignCreative(
  publicId: string,
  resourceType: PrivateResourceType,
  contentType: string,
): Promise<Response> {
  return fetchPrivateAsset(publicId, { resourceType, contentType, maxWidth: 1600 })
}

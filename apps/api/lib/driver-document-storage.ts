import {
  destroyPrivateAsset,
  fetchPrivateAsset,
  uploadPrivateAsset,
} from "@/lib/private-media"

/**
 * Driver documents (National ID, profile photo, KRA PIN certificate, payout
 * proof) — a thin, image-only binding over lib/private-media.ts, which holds
 * the shared Cloudinary "authenticated" storage logic and is also used by
 * campaign creatives.
 *
 * The rules that module documents apply here unchanged: the signed URL is
 * minted and fetched server-side only and never handed to a client, and
 * callers expose only the DB-assigned DriverDocument id, never the Cloudinary
 * public_id or any Cloudinary URL.
 */

export const ALLOWED_DOCUMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

export function buildDriverDocumentPublicId(
  profileId: number,
  type: string,
  uploadId: string,
): string {
  return `driver-documents/${profileId}/${type}/${uploadId}`
}

export async function uploadDriverDocument(
  file: File,
  publicId: string,
): Promise<{ publicId: string; contentType: string; sizeBytes: number }> {
  const { contentType, sizeBytes } = await uploadPrivateAsset(file, publicId, "image")
  return { publicId, contentType, sizeBytes }
}

export async function destroyDriverDocument(publicId: string): Promise<void> {
  await destroyPrivateAsset(publicId, "image")
}

/** Every driver-document preview in this app renders well under 800px —
 * capping dimensions and letting Cloudinary auto-pick quality/format turns a
 * multi-MB phone-camera photo into a fast, small download instead of shipping
 * the original full-resolution file on every view. */
export function fetchDriverDocument(publicId: string): Promise<Response> {
  return fetchPrivateAsset(publicId, { resourceType: "image", maxWidth: 800 })
}

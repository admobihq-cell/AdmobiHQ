import type { UploadApiOptions, UploadApiResponse } from "cloudinary"

import { cloudinary } from "@/lib/cloudinary"

/**
 * Private file storage on Cloudinary, shared by driver documents (National ID,
 * profile photo, KRA PIN certificate, payout proof) and campaign creatives
 * (advertiser artwork for the taxi-top and delivery-bike LED panels).
 *
 * Everything here uses Cloudinary's "authenticated" delivery type, which
 * requires a signed URL to fetch — unlike the "upload"/public type this repo's
 * only other file-storage integration (Vercel Blob, see
 * app/v1/notifications/broadcast-image) uses for ops announcement images.
 *
 * The signed URL is generated and fetched server-side only, inside
 * fetchPrivateAsset below — it is never handed to a client. Callers expose
 * only the DB-assigned row id, never the Cloudinary public_id or any
 * Cloudinary URL.
 *
 * This module is deliberately generic over resource_type: driver documents are
 * always images, campaign creatives may be MP4 video, and a second copy of
 * this logic for video would drift from this one.
 */

export type PrivateResourceType = "image" | "video"

export type UploadedAsset = {
  publicId: string
  contentType: string
  sizeBytes: number
  /** Present for images and video; Cloudinary reports both. */
  width: number | null
  height: number | null
  /** Video only. */
  durationSeconds: number | null
}

/**
 * Streams the buffer to Cloudinary rather than inlining it as a base64 data
 * URI.
 *
 * The data-URI form (which the driver-document path used before this module
 * existed) inflates payloads by ~33% and runs into Cloudinary's data-URI size
 * ceiling: a 50MB creative becomes a ~67MB request and fails outright. The
 * stream form has no such inflation, and produces an identical stored asset,
 * so both callers use it.
 */
function uploadBuffer(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error)
      else if (!result) reject(new Error("Cloudinary upload returned no result"))
      else resolve(result)
    })
    stream.end(buffer)
  })
}

export async function uploadPrivateAsset(
  file: File,
  publicId: string,
  resourceType: PrivateResourceType,
): Promise<UploadedAsset> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Accounts on Cloudinary's newer "Dynamic Folder Mode" only nest an asset
  // under the Media Library folder tree if asset_folder is set explicitly —
  // slashes in public_id alone (the legacy "Fixed Folder Mode" behavior) are
  // NOT enough and everything lands in the account's default folder instead.
  const assetFolder = publicId.split("/").slice(0, -1).join("/")

  const result = await uploadBuffer(buffer, {
    public_id: publicId,
    asset_folder: assetFolder,
    type: "authenticated",
    resource_type: resourceType,
    overwrite: true,
  })

  return {
    publicId,
    contentType: file.type,
    sizeBytes: buffer.byteLength,
    // Read eagerly off the upload response: these are exactly the spec fields
    // the supplier screen APIs ask for, and recovering them later would mean
    // re-downloading every asset.
    width: typeof result.width === "number" ? result.width : null,
    height: typeof result.height === "number" ? result.height : null,
    durationSeconds: typeof result.duration === "number" ? result.duration : null,
  }
}

export async function destroyPrivateAsset(
  publicId: string,
  resourceType: PrivateResourceType,
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      type: "authenticated",
      resource_type: resourceType,
    })
  } catch (error) {
    // Best-effort — an orphaned Cloudinary asset is harmless (it's never
    // reachable without a fresh signed URL minted from our own DB), so a
    // delete failure here shouldn't block the caller's DB write.
    console.error("[private-media] destroy failed:", error)
  }
}

/**
 * Delivery transformation, picked per asset kind.
 *
 * Animated GIF is the special case: `fetch_format: "auto"` would let Cloudinary
 * deliver animated WebP (or a video) instead, whose bytes would then be
 * streamed back under the `image/gif` Content-Type we stored — a
 * format/header mismatch. Serving GIFs untransformed keeps the animation and
 * keeps the header honest.
 */
function deliveryTransform(
  resourceType: PrivateResourceType,
  contentType: string | undefined,
  maxWidth: number | null,
): Record<string, unknown> {
  if (resourceType === "video") {
    // No width cap and no fetch_format: a reviewer has to see what will
    // actually play on the panel, and on-the-fly video transformation is slow
    // enough to stall the first preview.
    return { quality: "auto" }
  }
  if (contentType === "image/gif") return {}
  return {
    ...(maxWidth ? { width: maxWidth, crop: "limit" } : {}),
    quality: "auto",
    fetch_format: "auto",
  }
}

/**
 * Mints a fresh signed URL server-side and fetches it immediately — the URL
 * itself never leaves this process. Throws if the fetch fails.
 */
export async function fetchPrivateAsset(
  publicId: string,
  options: {
    resourceType: PrivateResourceType
    /** Stored content type, used only to detect animated GIF. */
    contentType?: string
    /** Cap the delivered width for images. Null delivers full size. */
    maxWidth?: number | null
  },
): Promise<Response> {
  const { resourceType, contentType, maxWidth = 800 } = options

  const signedUrl = cloudinary.url(publicId, {
    type: "authenticated",
    resource_type: resourceType,
    sign_url: true,
    secure: true,
    ...deliveryTransform(resourceType, contentType, maxWidth),
    // The Node SDK's default analytics query param requires resolving its own
    // package version at runtime, which throws "Must supply sdk_semver" under
    // Next.js's bundled/webpack dev runtime — disabling it (a purely cosmetic
    // tracking param, irrelevant for URLs we mint and discard server-side)
    // avoids that crash entirely.
    analytics: false,
  })

  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Cloudinary fetch failed: ${response.status}`)
  }
  return response
}

import { cloudinary } from "@/lib/cloudinary"

export const ALLOWED_DOCUMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

/**
 * Driver documents (National ID, profile photo, KRA PIN certificate, payout
 * proof) are uploaded with Cloudinary's "authenticated" delivery type, which
 * requires a signed URL to fetch — unlike the "upload"/public type this
 * repo's only other file-storage integration (Vercel Blob, see
 * app/v1/notifications/broadcast-image) uses for ops announcement images.
 *
 * The signed URL is generated and fetched server-side only, inside
 * fetchDriverDocument below — it is never handed to a client. Callers
 * (apps/api/app/v1/driver/documents/*, apps/api/app/v1/driver-applications/*)
 * only ever expose the DB-assigned DriverDocument id, never the Cloudinary
 * public_id or any Cloudinary URL.
 */

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
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`

  // Accounts on Cloudinary's newer "Dynamic Folder Mode" only nest an asset
  // under the Media Library folder tree if asset_folder is set explicitly —
  // slashes in public_id alone (the legacy "Fixed Folder Mode" behavior) are
  // NOT enough and everything lands in the account's default folder instead.
  const assetFolder = publicId.split("/").slice(0, -1).join("/")

  await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    asset_folder: assetFolder,
    type: "authenticated",
    resource_type: "image",
    overwrite: true,
  })

  return { publicId, contentType: file.type, sizeBytes: buffer.byteLength }
}

export async function destroyDriverDocument(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      type: "authenticated",
      resource_type: "image",
    })
  } catch (error) {
    // Best-effort — an orphaned Cloudinary asset is harmless (it's never
    // reachable without a fresh signed URL minted from our own DB), so a
    // delete failure here shouldn't block the caller's DB write.
    console.error("[driver-document-storage] destroy failed:", error)
  }
}

/** Mints a fresh signed URL server-side and fetches it immediately — the URL
 * itself never leaves this process. Throws if the fetch fails. */
export async function fetchDriverDocument(publicId: string): Promise<Response> {
  const signedUrl = cloudinary.url(publicId, {
    type: "authenticated",
    resource_type: "image",
    sign_url: true,
    secure: true,
    // Every preview in this app renders well under 800px — capping
    // dimensions and letting Cloudinary auto-pick quality/format turns a
    // multi-MB phone-camera photo into a fast, small download instead of
    // shipping the original full-resolution file on every view.
    width: 800,
    crop: "limit",
    quality: "auto",
    fetch_format: "auto",
    // The Node SDK's default analytics query param requires resolving its
    // own package version at runtime, which throws "Must supply sdk_semver"
    // under Next.js's bundled/webpack dev runtime — disabling it (a purely
    // cosmetic tracking param, irrelevant for URLs we mint and discard
    // server-side) avoids that crash entirely.
    analytics: false,
  })

  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Cloudinary fetch failed: ${response.status}`)
  }
  return response
}

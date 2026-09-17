import {
  destroyPrivateAsset,
  fetchPrivateAsset,
  uploadPrivateAsset,
  type UploadedAsset,
} from "@/lib/private-media"

/**
 * SOS incident photos — damage, the scene, an injury.
 *
 * Deliberately thin: all Cloudinary behaviour (authenticated delivery type,
 * signed URLs minted and fetched server-side only, the Dynamic Folder Mode
 * asset_folder handling) lives in lib/private-media.ts and is shared with
 * driver documents and campaign creatives. This file owns only the SOS naming
 * convention and the fact that incident photos are always images.
 */

export function buildIncidentPhotoPublicId(incidentId: number, uploadId: string): string {
  return `safety-incidents/${incidentId}/${uploadId}`
}

export function uploadIncidentPhoto(file: File, publicId: string): Promise<UploadedAsset> {
  return uploadPrivateAsset(file, publicId, "image")
}

export function destroyIncidentPhoto(publicId: string): Promise<void> {
  return destroyPrivateAsset(publicId, "image")
}

/**
 * 800px is plenty: an ops reviewer looks at a damaged screen on a laptop, and
 * a full-resolution phone photo is several MB on every view.
 */
export function fetchIncidentPhoto(publicId: string, contentType: string): Promise<Response> {
  return fetchPrivateAsset(publicId, { resourceType: "image", contentType, maxWidth: 800 })
}

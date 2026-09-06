import type { ImagePickerAsset } from "expo-image-picker"

import type { PendingPhoto } from "@/lib/sos"

/** Mirrors MAX_INCIDENT_PHOTOS in apps/api/lib/safety-incident.ts. The server
 *  is the real gate; this just stops the picker offering a fifth. */
export const MAX_PENDING_PHOTOS = 4

/** The API only accepts JPEG, PNG, and WebP. HEIC from an iPhone camera roll
 *  arrives with no mimeType often enough that guessing JPEG is the useful
 *  default — expo-image-picker transcodes to JPEG unless asked otherwise. */
export function pendingPhotoFromAsset(asset: ImagePickerAsset): PendingPhoto {
  const mimeType = asset.mimeType ?? "image/jpeg"
  const extension = mimeType.split("/")[1] ?? "jpg"
  return {
    uri: asset.uri,
    mimeType,
    fileName: asset.fileName ?? `sos-${Date.now()}.${extension}`,
  }
}

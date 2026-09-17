"use client"

/**
 * Hands the photos chosen on /sos to /sos/[id] for upload.
 *
 * Deliberately an in-memory module variable, not localStorage or a query
 * param: a File cannot be serialised, and the two pages are one client-side
 * navigation apart so the module stays alive between them. If the driver
 * hard-reloads the tracking page the photos are simply gone — they can add
 * them again from there, and the incident itself is already safely filed.
 */

let pending: { incidentId: number; files: File[] } | null = null

export function setPendingSosPhotos(incidentId: number, files: File[]): void {
  pending = files.length > 0 ? { incidentId, files } : null
}

/** Reads and clears in one go, so a re-render can't upload the same files twice. */
export function takePendingSosPhotos(incidentId: number): File[] {
  if (!pending || pending.incidentId !== incidentId) return []
  const { files } = pending
  pending = null
  return files
}

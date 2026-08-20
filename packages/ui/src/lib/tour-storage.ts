/**
 * Per-visitor "has this user seen the product tour" state, namespaced per
 * app + Clerk user id. Same shape as cookie-consent.ts — client-side only,
 * no backend model exists for user preferences yet. A replay from Settings
 * never touches this: only the automatic first-run tour marks itself done.
 */

function tourStorageKey(app: string, userId: string): string {
  return `admobi.tour.${app}.${userId}`
}

export function readTourCompleted(app: string, userId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(tourStorageKey(app, userId)) !== null
  } catch {
    return false
  }
}

export function writeTourCompleted(app: string, userId: string): void {
  if (typeof window === "undefined") return
  try {
    const record = { completed: true, completedAt: new Date().toISOString() }
    window.localStorage.setItem(
      tourStorageKey(app, userId),
      JSON.stringify(record)
    )
  } catch {
    // Storage blocked (e.g. Safari private mode) — tour just replays next visit.
  }
}

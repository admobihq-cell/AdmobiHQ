/**
 * Per-visitor "has this user dismissed the finish-your-profile nudge" state,
 * namespaced per Clerk user id. Same shape as org-name-nudge-storage — the
 * profile stays exactly as it is either way, this only stops re-prompting.
 */

function storageKey(userId: string): string {
  return `admobi.profileNudgeDismissed.${userId}`
}

export function readProfileNudgeDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(storageKey(userId)) !== null
  } catch {
    return false
  }
}

export function writeProfileNudgeDismissed(userId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(userId), new Date().toISOString())
  } catch {
    // Storage blocked (e.g. Safari private mode) — nudge just reappears next visit.
  }
}

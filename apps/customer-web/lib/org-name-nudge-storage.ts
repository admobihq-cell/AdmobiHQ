/**
 * Per-visitor "has this user dismissed the rename-your-org nudge" state,
 * namespaced per Clerk user id. Same shape as @workspace/ui's tour-storage —
 * client-side only, the org keeps its auto-generated name either way, this
 * just stops re-prompting.
 */

function storageKey(userId: string): string {
  return `admobi.orgNameNudgeDismissed.${userId}`
}

export function readOrgNameNudgeDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(storageKey(userId)) !== null
  } catch {
    return false
  }
}

export function writeOrgNameNudgeDismissed(userId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(userId), new Date().toISOString())
  } catch {
    // Storage blocked (e.g. Safari private mode) — nudge just reappears next visit.
  }
}

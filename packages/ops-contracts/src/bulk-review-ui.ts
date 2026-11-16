import type { BulkReviewResult } from "./schemas"

/** The API refuses a batch over this (`bulkReviewSchema`), so the selection stops here. */
export const BULK_REVIEW_MAX = 100

/** "2 approved, 1 skipped (not in review)": the banner after a bulk review, worded as on ops web. */
export function bulkReviewSummary(decision: "approved" | "rejected", result: BulkReviewResult): string {
  const done = result.updated.length === 0 ? `Nothing ${decision}` : `${result.updated.length} ${decision}`
  const skipped = result.skipped.length ? `, ${result.skipped.length} skipped (not in review)` : ""
  return done + skipped
}

/** Adds or removes `id`, leaving the original set alone. Adding past the batch limit is ignored. */
export function toggleSelection(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else if (next.size < BULK_REVIEW_MAX) next.add(id)
  return next
}

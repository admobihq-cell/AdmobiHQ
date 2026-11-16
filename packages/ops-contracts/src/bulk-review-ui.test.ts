import { describe, expect, it } from "vitest"

import { BULK_REVIEW_MAX, bulkReviewSummary, toggleSelection } from "./bulk-review-ui"

describe("bulkReviewSummary", () => {
  it("says what happened, with the web's wording for skipped rows", () => {
    expect(bulkReviewSummary("approved", { updated: [1, 2], skipped: [{ id: 3, error: "x" }] })).toBe(
      "2 approved, 1 skipped (not in review)",
    )
    expect(bulkReviewSummary("rejected", { updated: [4], skipped: [] })).toBe("1 rejected")
  })

  it("does not claim success when nothing changed", () => {
    expect(bulkReviewSummary("approved", { updated: [], skipped: [{ id: 1, error: "x" }, { id: 2, error: "y" }] })).toBe(
      "Nothing approved, 2 skipped (not in review)",
    )
  })
})

describe("toggleSelection", () => {
  it("adds and removes without mutating the original", () => {
    const a = new Set([1])
    const b = toggleSelection(a, 2)
    expect([...b]).toEqual([1, 2])
    expect([...a]).toEqual([1])
    expect([...toggleSelection(b, 1)]).toEqual([2])
  })

  it("stops at the API's batch limit instead of sending a request that would 400", () => {
    const full = new Set(Array.from({ length: BULK_REVIEW_MAX }, (_, i) => i + 1))
    expect(toggleSelection(full, 999).size).toBe(BULK_REVIEW_MAX)
    expect(toggleSelection(full, 1).size).toBe(BULK_REVIEW_MAX - 1) // deselecting still works
  })
})

import type { DateRangeKey, OpsPermission } from "@workspace/ops-contracts"
import { describe, expect, it, vi } from "vitest"

import { queryActionQueue, type ActionQueueSources } from "./action-queue"

const has = (...perms: OpsPermission[]) => (p: OpsPermission) => perms.includes(p)
const range: DateRangeKey = "30d"

/** Sources that return just enough shape for the queue; each is a spy so tests can see what ran. */
function sources(over: Partial<ActionQueueSources> = {}) {
  const s = {
    pipeline: vi.fn(async () => ({ inReview: 2, queue: [{ waitingHours: 50 }] })),
    delivery: vi.fn(async () => ({ rows: [{ health: { level: "at_risk" } }, { health: { level: "on_track" } }] })),
    fleet: vi.fn(async () => ({ pendingApplications: 4, queue: [] })),
    support: vi.fn(async () => ({ urgentOpen: 1, safety: { criticalIncidents: 2 } })),
    financePayouts: vi.fn(async () => ({
      byStatus: [
        { status: "pending", count: 3, amountKes: 9000 },
        { status: "failed", count: 1, amountKes: 500 },
      ],
    })),
    ...over,
  }
  return s as unknown as ActionQueueSources & typeof s
}

describe("queryActionQueue", () => {
  it("runs only the sources the viewer may open: a support-only role never touches campaigns, fleet or finance", async () => {
    const s = sources()
    const items = await queryActionQueue(has("support"), range, s)
    expect(items.map((i) => i.title)).toEqual(["Urgent support cases open"])
    expect(s.pipeline).not.toHaveBeenCalled()
    expect(s.delivery).not.toHaveBeenCalled()
    expect(s.fleet).not.toHaveBeenCalled()
    expect(s.financePayouts).not.toHaveBeenCalled()
  })

  it("adds the critical-incidents row only with both support and safety", async () => {
    const withSafety = await queryActionQueue(has("support", "safety"), range, sources())
    expect(withSafety.map((i) => i.title)).toContain("Critical safety incidents open")
    const without = await queryActionQueue(has("support"), range, sources())
    expect(without.map((i) => i.title)).not.toContain("Critical safety incidents open")
  })

  it("drops rows with nothing to do", async () => {
    const s = sources({ fleet: vi.fn(async () => ({ pendingApplications: 0, queue: [] })) as never })
    expect((await queryActionQueue(has("drivers"), range, s)).length).toBe(0)
  })

  it("drops only the row whose source fails, not the whole list", async () => {
    const s = sources({ support: vi.fn(async () => Promise.reject(new Error("boom"))) as never })
    const items = await queryActionQueue(has("support", "drivers"), range, s)
    expect(items.map((i) => i.title)).toEqual(["Driver applications waiting"])
  })

  it("marks a campaign review that has waited 48h or more as serious, and counts at-risk campaigns", async () => {
    const items = await queryActionQueue(has("campaigns"), range, sources())
    expect(items.find((i) => i.title === "Campaigns waiting for review")).toMatchObject({ tone: "serious", count: 2 })
    expect(items.find((i) => i.title === "Campaigns at risk")?.count).toBe(1)
  })

  it("builds the payout rows from the all-time payouts breakdown", async () => {
    const items = await queryActionQueue(has("finances"), range, sources())
    expect(items.map((i) => [i.title, i.count])).toEqual([["Payouts pending", 3], ["Payouts failed", 1]])
    expect(items[0]!.meta).toContain("9,000")
  })
})

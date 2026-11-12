import { afterEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

type Access = { userId: string; role: "admin" | "member"; permissions: string[] }
let access: Access | null = { userId: "ops-test", role: "member", permissions: [] }

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsAccess: vi.fn(async () =>
      access ? { access } : { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) },
    ),
  }
})

// When `stubbed` is on, the DB-bound dashboard queries return canned shapes, so the permission filter
// is tested without a database. `queryActionQueue` itself stays real.
let stubbed = true
vi.mock("@workspace/ops-queries", async () => {
  const actual = await vi.importActual<typeof import("@workspace/ops-queries")>("@workspace/ops-queries")
  const pick = <K extends keyof typeof actual>(name: K, fake: unknown) =>
    vi.fn((...args: unknown[]) => (stubbed ? (fake as (...a: unknown[]) => unknown)(...args) : (actual[name] as (...a: unknown[]) => unknown)(...args)))
  return {
    ...actual,
    queryPipeline: pick("queryPipeline", async () => ({ inReview: 2, queue: [{ waitingHours: 50 }] })),
    queryDelivery: pick("queryDelivery", async () => ({ rows: [{ health: { level: "at_risk" } }] })),
    queryFleet: pick("queryFleet", async () => ({ pendingApplications: 4, queue: [] })),
    querySupport: pick("querySupport", async () => ({ urgentOpen: 1, safety: { criticalIncidents: 2 } })),
    queryFinancePayouts: pick("queryFinancePayouts", async () => ({ byStatus: [{ status: "failed", count: 1, amountKes: 500 }] })),
  }
})

import { GET } from "./route"

const call = (query = "") => new Request(`http://localhost/v1/ops/action-queue${query}`)
const as = (permissions: string[], role: Access["role"] = "member") => {
  access = { userId: "ops-test", role, permissions }
}
const titles = async (res: Response) => ((await res.json()) as { items: { title: string }[] }).items.map((i) => i.title)

afterEach(() => {
  as([])
  stubbed = true
})

describe("GET /v1/ops/action-queue", () => {
  it("is 401 for someone who isn't an ops user", async () => {
    access = null
    expect((await GET(call())).status).toBe(401)
  })

  it("rejects an unknown range with 400", async () => {
    as(["support"])
    const res = await GET(call("?range=bogus"))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("range") })
  })

  it("a role with only support gets no campaign, fleet or finance items", async () => {
    as(["support"])
    const res = await GET(call())
    expect(res.status).toBe(200)
    expect(await titles(res)).toEqual(["Urgent support cases open"])
  })

  it("a member with no permissions gets an empty queue, not an error", async () => {
    as([])
    expect(await titles(await GET(call()))).toEqual([])
  })

  it("an admin gets every kind of item", async () => {
    as([], "admin")
    expect(await titles(await GET(call()))).toEqual([
      "Campaigns waiting for review",
      "Campaigns at risk",
      "Driver applications waiting",
      "Urgent support cases open",
      "Critical safety incidents open",
      "Payouts failed",
    ])
  })
})

describe.skipIf(!testDatabaseUrl())("GET /v1/ops/action-queue against the dev database", { timeout: 30_000 }, () => {
  it("answers 200 with well-formed items for an admin", async () => {
    stubbed = false
    // The queue drops any source that fails, so an unreachable database would pass as an empty list.
    // Reach it directly first, so this test fails when there is no database rather than proving nothing.
    const { opsDb } = await import("@/lib/ops-db")
    await opsDb().query("SELECT 1")
    as([], "admin")
    const res = await GET(call("?range=30d"))
    expect(res.status).toBe(200)
    const { items } = (await res.json()) as { items: { count: number; href: string }[] }
    for (const item of items) {
      expect(item.count).toBeGreaterThan(0)
      expect(item.href.startsWith("/")).toBe(true)
    }
  })
})

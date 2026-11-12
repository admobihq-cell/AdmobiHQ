import { afterEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

type Access = { userId: string; role: "admin" | "member"; permissions: string[] }
let access: Access = { userId: "ops-test", role: "member", permissions: [] }

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async (permission: string) =>
      access.role === "admin" || access.permissions.includes(permission)
        ? { access }
        : { error: new Response(JSON.stringify({ error: `Forbidden — "${permission}" access required` }), { status: 403 }) },
    ),
  }
})

import { GET as advertisers } from "./advertisers/route"
import { GET as campaigns } from "./campaigns/route"
import { GET as fleet } from "./fleet/route"
import { GET as support } from "./support/route"

const call = (query = "") => new Request(`http://localhost/v1/ops/dashboards/x${query}`)
const as = (permissions: string[], role: Access["role"] = "member") => {
  access = { userId: "ops-test", role, permissions }
}

/** True when `key` appears anywhere in a JSON payload: "absent" means absent at any depth. */
function hasKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((v) => hasKey(v, key))
  if (value && typeof value === "object")
    return Object.entries(value).some(([k, v]) => k === key || hasKey(v, key))
  return false
}

function expectFinite(value: unknown, path = "$"): void {
  if (typeof value === "number") expect(Number.isFinite(value), `${path} is ${value}`).toBe(true)
  else if (Array.isArray(value)) value.forEach((v, i) => expectFinite(v, `${path}[${i}]`))
  else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => expectFinite(v, `${path}.${k}`))
}

afterEach(() => as([]))

describe("ops dashboards: permission", () => {
  it.each([
    ["campaigns", campaigns, "campaigns"],
    ["advertisers", advertisers, "campaigns"],
    ["fleet", fleet, "drivers"],
    ["support", support, "support"],
  ] as const)("%s is 403 without the %s permission", async (_name, handler, needed) => {
    as(["finances", "safety"].filter((p) => p !== needed)) // holds other permissions, not the right one
    expect((await handler(call())).status).toBe(403)
  })
})

describe("ops dashboards: validation", () => {
  it("rejects an unknown range with 400", async () => {
    as(["campaigns", "drivers", "support"])
    for (const handler of [campaigns, advertisers, fleet, support]) {
      const res = await handler(call("?range=bogus"))
      expect(res.status).toBe(400)
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("range") })
    }
  })

  it("rejects an unknown campaigns tab with 400", async () => {
    as(["campaigns"])
    const res = await campaigns(call("?tab=nope"))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("tab") })
  })
})

// Each dashboard runs a dozen queries and the dev database can be cold, so allow more than the 5 s default.
describe.skipIf(!testDatabaseUrl())("ops dashboards: against the dev database", { timeout: 30_000 }, () => {
  it("campaigns: all three tabs answer 200 with finite numbers", async () => {
    as(["campaigns", "finances"])
    for (const tab of ["pipeline", "delivery", "inventory"]) {
      const res = await campaigns(call(`?tab=${tab}&range=30d`))
      expect(res.status, tab).toBe(200)
      expectFinite(await res.json())
    }
  })

  it("campaigns: the default tab is the pipeline", async () => {
    as(["campaigns"])
    const body = await (await campaigns(call())).json()
    expect(body).toHaveProperty("funnel")
  })

  it("without finances, no money reaches the response: not booked value, not budget by format", async () => {
    as(["campaigns"])
    const pipeline = await (await campaigns(call("?tab=pipeline"))).json()
    expect(pipeline.includeMoney).toBe(false)
    expect(pipeline.bookedKes).toBeNull()
    // The review queue rows carry each campaign's budget too: null for every row, not just the total.
    for (const row of pipeline.queue) expect(row.budgetKes).toBeNull()
    const inventory = await (await campaigns(call("?tab=inventory"))).json()
    expect(inventory.includeMoney).toBe(false)
    expect(inventory.budgetByFormat).toBeNull()
  })

  it("with finances, the same tabs carry the money", async () => {
    as(["campaigns", "finances"])
    const pipeline = await (await campaigns(call("?tab=pipeline"))).json()
    expect(pipeline.includeMoney).toBe(true)
    const inventory = await (await campaigns(call("?tab=inventory"))).json()
    expect(Array.isArray(inventory.budgetByFormat)).toBe(true)
  })

  it("an admin sees the money without holding finances by name", async () => {
    as([], "admin")
    expect((await (await campaigns(call("?tab=pipeline"))).json()).includeMoney).toBe(true)
  })

  it("fleet: money is absent without finances and present with it", async () => {
    as(["drivers"])
    const without = await (await fleet(call())).json()
    expect(hasKey(without, "money")).toBe(false)
    expect(hasKey(without, "payoutsPendingKes")).toBe(false)
    as(["drivers", "finances"])
    const withMoney = await (await fleet(call())).json()
    expect(withMoney.money).toMatchObject({ payoutsPendingKes: expect.any(Number) })
    expectFinite(withMoney)
  })

  it("advertisers: the spend figures are absent without finances", async () => {
    as(["campaigns"])
    const body = await (await advertisers(call())).json()
    for (const key of ["liveSpenders", "avgSpendKes", "top5Share", "shortOfFunds", "spendDown"]) {
      expect(hasKey(body, key), key).toBe(false)
    }
    as(["campaigns", "finances"])
    const withMoney = await (await advertisers(call())).json()
    expect(hasKey(withMoney, "liveSpenders")).toBe(true)
    expectFinite(withMoney)
  })

  it("support: the safety section needs the safety permission as well", async () => {
    as(["support"])
    expect((await (await support(call())).json()).safety).toBeNull()
    as(["support", "safety"])
    const withSafety = await (await support(call())).json()
    expect(withSafety.safety).toMatchObject({ openIncidents: expect.any(Number) })
    expectFinite(withSafety)
  })
})

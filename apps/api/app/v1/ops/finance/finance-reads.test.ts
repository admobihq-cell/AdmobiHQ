import { afterEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

let allowed = true

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async (permission: string) =>
      allowed && permission === "finances"
        ? { access: { userId: "ops-test", role: "admin", permissions: ["finances"] } }
        : { error: new Response(JSON.stringify({ error: `Forbidden — "${permission}" access required` }), { status: 403 }) },
    ),
  }
})

import { GET as unseenGet, POST as unseenPost } from "../payments/unseen/route"
import { GET as attention } from "./attention/route"
import { GET as ledger } from "./ledger/route"
import { GET as overview } from "./overview/route"
import { GET as payouts } from "./payouts/route"
import { GET as recordOptions } from "./record-options/route"
import { GET as toolCosts } from "./tool-costs/route"
import { GET as wallets } from "./wallets/route"

const call = (query = "") => new Request(`http://localhost/v1/ops/finance/x${query}`)
type Handler = (req: Request) => Promise<Response>
const reads: Record<string, Handler> = { overview, ledger, wallets, payouts, attention, recordOptions, toolCosts }
const rangeReads: Record<string, Handler> = { overview, ledger, payouts }

/** Every number in a payload must be finite: NaN and Infinity serialise to null and hide bugs. */
function expectFinite(value: unknown, path = "$"): void {
  if (typeof value === "number") expect(Number.isFinite(value), `${path} is ${value}`).toBe(true)
  else if (Array.isArray(value)) value.forEach((v, i) => expectFinite(v, `${path}[${i}]`))
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([k, v]) => expectFinite(v, `${path}.${k}`))
}

afterEach(() => {
  allowed = true
})

describe("ops finance reads: permission", () => {
  it.each(Object.entries(reads))("%s is 403 without the finances permission", async (_name, handler) => {
    allowed = false
    expect((await handler(call())).status).toBe(403)
  })

  it("the unseen-payments badge is 403 without the finances permission, for both read and mark", async () => {
    allowed = false
    expect((await unseenGet()).status).toBe(403)
    expect((await unseenPost()).status).toBe(403)
  })
})

describe("ops finance reads: range", () => {
  it.each(Object.entries(rangeReads))("%s rejects an unknown range with 400", async (_name, handler) => {
    const res = await handler(call("?range=bogus"))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("range") })
  })
})

describe.skipIf(!testDatabaseUrl())("ops finance reads: against the dev database", () => {
  it("overview for 30d is 200 and every number in it is finite", async () => {
    const res = await overview(call("?range=30d"))
    expect(res.status).toBe(200)
    expectFinite(await res.json())
  })

  it("a missing range defaults to 30d, and 'all' is accepted", async () => {
    expect((await overview(call())).status).toBe(200)
    expect((await payouts(call("?range=all"))).status).toBe(200)
  })

  it.each(Object.entries(reads))("%s answers 200 with JSON and no non-finite numbers", async (_name, handler) => {
    const res = await handler(call("?range=30d"))
    expect(res.status).toBe(200)
    expectFinite(await res.json())
  })

  it("tool costs expose the monthly KES run-rate", async () => {
    const body = await (await toolCosts()).json()
    expect(body).toEqual({ monthlyKes: expect.any(Number), activeCount: expect.any(Number), byCategory: expect.any(Array) })
  })

  it("marking payments seen leaves nothing unseen", async () => {
    const marked = await (await unseenPost()).json()
    expect(marked).toEqual({ marked: expect.any(Number) })
    expect(await (await unseenGet()).json()).toEqual({ count: 0 })
  })
})

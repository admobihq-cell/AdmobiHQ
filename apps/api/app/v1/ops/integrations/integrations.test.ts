import { afterEach, describe, expect, it, vi } from "vitest"

import { totals } from "@workspace/ops-contracts/integration-costs"

import { auditFromOpsUser } from "@/lib/audit"
import { testDatabaseUrl } from "@/lib/test-database-url"

type Access = { userId: string; email: string; role: "admin" | "member"; permissions: string[] }
let access: Access = { userId: "ops-test", email: "admin@example.com", role: "member", permissions: [] }

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsAdminAccess: vi.fn(async () =>
      access.role === "admin"
        ? { access }
        : { error: new Response(JSON.stringify({ error: "Forbidden: admin access required" }), { status: 403 }) },
    ),
  }
})
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))

import { DELETE, PATCH } from "./[id]/route"
import { GET, POST } from "./route"

const json = (body: unknown) => new Request("http://localhost/v1/ops/integrations", { method: "POST", body: JSON.stringify(body) })
const withId = (id: string | number) => ({ params: Promise.resolve({ id: String(id) }) })
const valid = { name: "Route test tool", category: "developer", currency: "USD", billing_cycle: "monthly", status: "active", cost: 10 }
const asAdmin = () => {
  access = { ...access, role: "admin" }
}

afterEach(() => {
  access = { ...access, role: "member" }
  vi.mocked(auditFromOpsUser).mockClear()
})

describe("ops integrations: access and validation", () => {
  it("is 403 on every route for a member, even one holding finances", async () => {
    access = { ...access, role: "member", permissions: ["finances"] }
    expect((await GET()).status).toBe(403)
    expect((await POST(json(valid))).status).toBe(403)
    expect((await PATCH(json(valid), withId(1))).status).toBe(403)
    expect((await DELETE(new Request("http://localhost"), withId(1))).status).toBe(403)
  })

  it("rejects a bad body with 400 before touching the database, and writes no audit row", async () => {
    asAdmin()
    for (const bad of [{ ...valid, name: "" }, { ...valid, category: "nope" }, { ...valid, cost: -5 }, { ...valid, url: "not a url" }]) {
      expect((await POST(json(bad))).status).toBe(400)
    }
    expect(auditFromOpsUser).not.toHaveBeenCalled()
  })

  it("rejects a non-numeric id with 400", async () => {
    asAdmin()
    expect((await PATCH(json(valid), withId("abc"))).status).toBe(400)
    expect((await DELETE(new Request("http://localhost"), withId("abc"))).status).toBe(400)
  })
})

describe.skipIf(!testDatabaseUrl())("ops integrations: against the dev database", { timeout: 30_000 }, () => {
  it("create appears in the list with the same monthly totals the web computes, and delete removes it", async () => {
    asAdmin()
    const created = await POST(json({ ...valid, name: `Route test ${Date.now()}`, cost: 12.5 }))
    expect(created.status).toBe(201)
    const row = await created.json()
    try {
      expect(row).toMatchObject({ category: "developer", cost: 12.5, currency: "USD", updated_by_email: "admin@example.com" })
      expect(vi.mocked(auditFromOpsUser).mock.calls[0]![1]).toMatchObject({ action: "create", entity_type: "integration", entity_id: row.id })

      const listed = await (await GET()).json()
      expect(listed.items.map((i: { id: number }) => i.id)).toContain(row.id)
      // The API's totals are the web's own function over the same rows.
      expect(listed.totals.monthlyUsd).toBeCloseTo(totals(listed.items).monthlyUsd, 6)
      expect(listed.totals.monthlyKes).toBeCloseTo(totals(listed.items).monthlyKes, 6)

      const patched = await PATCH(json({ ...valid, name: row.name, cost: 20 }), withId(row.id))
      expect(patched.status).toBe(200)
      expect((await patched.json()).cost).toBe(20)
    } finally {
      expect((await DELETE(new Request("http://localhost"), withId(row.id))).status).toBe(200)
    }
    const after = await (await GET()).json()
    expect(after.items.map((i: { id: number }) => i.id)).not.toContain(row.id)
  })

  it("PATCH and DELETE of a missing id are 404, not a server error", async () => {
    asAdmin()
    expect((await PATCH(json(valid), withId(2_000_000_000))).status).toBe(404)
    expect((await DELETE(new Request("http://localhost"), withId(2_000_000_000))).status).toBe(404)
  })
})

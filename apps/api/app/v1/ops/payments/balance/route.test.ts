import { describe, expect, it, vi } from "vitest"

let allowed = true
vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async () =>
      allowed ? { access: { userId: "ops_1", email: "ops@x" } } : { error: actual.jsonError("Forbidden", 403) },
    ),
  }
})
vi.mock("@/lib/payments/paystack", async () => ({
  ...(await vi.importActual<typeof import("@/lib/payments/paystack")>("@/lib/payments/paystack")),
  getKesBalance: vi.fn(async () => 123456.78),
}))

import { GET } from "./route"

describe("GET /v1/ops/payments/balance", () => {
  it("needs finances", async () => {
    allowed = false
    expect((await GET()).status).toBe(403)
  })

  it("returns the live Paystack KES balance", async () => {
    allowed = true
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ balanceKes: 123456.78 })
  })
})

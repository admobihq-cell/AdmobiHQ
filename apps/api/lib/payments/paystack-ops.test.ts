import { beforeEach, describe, expect, it, vi } from "vitest"

const paystackPage = vi.fn()
const paystackGet = vi.fn()
vi.mock("@/lib/payments/paystack", async () => ({
  ...(await vi.importActual<typeof import("@/lib/payments/paystack")>("@/lib/payments/paystack")),
  paystackPage: (...a: unknown[]) => paystackPage(...a),
  paystackGet: (...a: unknown[]) => paystackGet(...a),
  getKesBalance: async () => 0,
}))
const findMany = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: { payment: { findMany: (...a: unknown[]) => findMany(...a) }, refund: { findMany: async () => [] }, payout: { findMany: async () => [] } },
}))

import { admobiMatch, listPaystack, paystackSummary } from "./paystack-ops"

/** Trimmed from a real test-mode /transaction item. */
const tx = (reference: string, status: string, amount: number) => ({
  id: 6770057466,
  status,
  reference,
  amount,
  fees: 15000,
  channel: "mobile_money",
  paid_at: "2026-11-16T14:44:25.000Z",
  created_at: "2026-11-16T14:43:52.000Z",
  gateway_response: status === "failed" ? "Insufficient funds" : "Approved",
  ip_address: "41.90.173.5",
  customer: { id: 1, email: "payer@example.com", customer_code: "CUS_x" },
  authorization: { authorization_code: "AUTH_secret123", signature: "SIG_secret456", reusable: true },
})

describe("listPaystack transactions", () => {
  beforeEach(() => vi.clearAllMocks())

  it("maps to the DTO, joins our rows, and never returns card codes, signatures or IPs", async () => {
    paystackPage.mockResolvedValue({
      data: [tx("adm-pay-aaa", "success", 1000000), tx("adm-pay-bbb", "success", 500000), tx("other-ccc", "failed", 100)],
      meta: { page: 1, pageCount: 3, total: 61 },
    })
    findMany.mockResolvedValue([
      { reference: "adm-pay-aaa", status: "success", org_id: 24, org: { name: "Acme" } },
      { reference: "adm-pay-bbb", status: "initiated", org_id: 24, org: { name: "Acme" } },
    ])

    const page = await listPaystack("transactions", { page: 1, perPage: 25, status: "success" })

    expect(JSON.stringify(page)).not.toMatch(/AUTH_|SIG_|41\.90|CUS_/)
    expect(page).toMatchObject({ page: 1, pageCount: 3, total: 61 })
    expect(page.rows.map((r) => [r.reference, r.match, r.orgName, r.amountKes])).toEqual([
      ["adm-pay-aaa", "credited", "Acme", 10000],
      ["adm-pay-bbb", "not_credited", "Acme", 5000],
      ["other-ccc", "not_ours", null, 1],
    ])
    expect(page.rows[2]!.gatewayResponse).toBe("Insufficient funds")
    expect(paystackPage.mock.calls[0]![0]).toBe("/transaction?perPage=25&page=1&status=success")
  })
})

describe("admobiMatch", () => {
  it("only flags money Paystack took that we never credited", () => {
    expect(admobiMatch("success", { status: "initiated" })).toBe("not_credited")
    expect(admobiMatch("failed", { status: "failed" })).toBe("credited")
    expect(admobiMatch("reversed", { status: "success" })).toBe("credited")
    expect(admobiMatch("success", undefined)).toBe("not_ours")
  })
})

describe("paystackSummary", () => {
  it("reads waiting-to-settle from all-time totals and volume from the range", async () => {
    paystackGet.mockImplementation(async (path: string) =>
      path.includes("from=")
        ? { total_transactions: 1, total_volume_by_currency: [{ currency: "KES", amount: 10000 }], pending_transfers: 0 }
        : { total_transactions: 9, pending_transfers_by_currency: [{ currency: "KES", amount: 10000 }] },
    )
    expect(await paystackSummary("2026-11-01T00:00:00.000Z")).toEqual({
      balanceKes: 0,
      waitingToSettleKes: 100,
      volumeKes: 100,
      transactionCount: 1,
    })
  })
})

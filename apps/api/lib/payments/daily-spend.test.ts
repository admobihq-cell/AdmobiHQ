import { createHmac } from "node:crypto"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

const settlePayment = vi.fn()
vi.mock("@/lib/payments/settle-payment", async () => ({
  ...(await vi.importActual<typeof import("@/lib/payments/settle-payment")>("@/lib/payments/settle-payment")),
  settlePayment: (...a: unknown[]) => settlePayment(...a),
}))
const notifyCreditReleased = vi.fn()
const alertOpsFinance = vi.fn()
vi.mock("@/lib/payments/money-notify", () => ({
  notifyCreditReleased: (...a: unknown[]) => notifyCreditReleased(...a),
  alertOpsFinance: (...a: unknown[]) => alertOpsFinance(...a),
}))

import { POST as webhook } from "@/app/v1/payments/paystack/webhook/route"
import { dailySpendRows, writeDailySpend } from "./daily-spend"
import { releaseCompletedCredit, sendFinanceDigest } from "./finance-daily"

const databaseUrl = testDatabaseUrl()
const SECRET = "sk_test_webhook"

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PAYSTACK_SECRET_KEY = SECRET
})

describe("paystack webhook", () => {
  const send = (body: object, signature?: string) => {
    const raw = JSON.stringify(body)
    const sig = signature ?? createHmac("sha512", SECRET).update(raw).digest("hex")
    return webhook(new Request("http://localhost", { method: "POST", body: raw, headers: { "x-paystack-signature": sig } }))
  }

  it("settles charge.success with a valid signature", async () => {
    settlePayment.mockResolvedValue("settled")
    const res = await send({ event: "charge.success", data: { reference: "adm-pay-aaaaaaaaaaaa" } })
    expect(res.status).toBe(200)
    expect(settlePayment).toHaveBeenCalledWith("adm-pay-aaaaaaaaaaaa")
  })

  it("rejects a bad signature without calling anything", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const res = await send({ event: "charge.success", data: { reference: "x" } }, "0".repeat(128))
    expect(res.status).toBe(401)
    expect(settlePayment).not.toHaveBeenCalled()
  })

  it("ignores unknown events", async () => {
    const res = await send({ event: "subscription.create", data: {} })
    expect(await res.json()).toEqual({ ignored: true })
  })

  it("answers 500 when a handler throws, so Paystack retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    settlePayment.mockRejectedValue(new Error("db down"))
    const res = await send({ event: "charge.success", data: { reference: "adm-pay-aaaaaaaaaaaa" } })
    expect(res.status).toBe(500)
  })
})

describe("dailySpendRows", () => {
  const c = { id: 9, budgetKes: 10000, startsOn: "2026-11-01", endsOn: "2026-11-03", approvedOn: "2026-11-01" }

  it("splits the budget with the last day taking the remainder", () => {
    expect(dailySpendRows(c, new Set(), "2026-11-03")).toEqual([
      { reference: "spend-c9-2026-11-01", day: "2026-11-01", amountKes: 3333.33 },
      { reference: "spend-c9-2026-11-02", day: "2026-11-02", amountKes: 3333.33 },
      { reference: "spend-c9-2026-11-03", day: "2026-11-03", amountKes: 3333.34 },
    ])
  })

  it("never charges days before approval", () => {
    expect(dailySpendRows({ ...c, approvedOn: "2026-11-02" }, new Set(), "2026-11-03").map((r) => r.day)).toEqual([
      "2026-11-02",
      "2026-11-03",
    ])
  })

  it("stops at yesterday", () => {
    expect(dailySpendRows(c, new Set(), "2026-11-01")).toHaveLength(1)
  })

  it("skips rows already written", () => {
    expect(dailySpendRows(c, new Set(["spend-c9-2026-11-01", "spend-c9-2026-11-02"]), "2026-11-03")).toHaveLength(1)
  })
})

describe("sendFinanceDigest (counts mocked via an empty DB slice)", () => {
  it.skipIf(!databaseUrl)("alerts with email only when something needs attention", async () => {
    const { items } = await sendFinanceDigest()
    if (items === 0) expect(alertOpsFinance).not.toHaveBeenCalled()
    else expect(alertOpsFinance).toHaveBeenCalledWith(expect.objectContaining({ email: true }))
  })
})

describe.skipIf(!databaseUrl)("nightly spend and credit release", { timeout: 60_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `spend-test-${Date.now()}`
  // A fixed "today" so the flight is fully in the past: Nov 1–3, cron runs Nov 4.
  const today = new Date("2026-11-04T05:00:00Z")
  let orgId = 0

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
  }, 30_000)

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.refund.deleteMany({ where: { org_id: orgId } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("writes each elapsed day once, however often it runs", async () => {
    const c = await prisma.campaign.create({
      data: {
        clerk_user_id: tag, org_id: orgId, name: `${tag} flight`, budget_kes: 10000, status: "approved",
        funded_at: new Date("2026-10-30"), reviewed_at: new Date("2026-11-01T06:00:00Z"),
        starts_on: new Date("2026-11-01"), ends_on: new Date("2026-11-03"),
      },
    })
    await writeDailySpend(today)
    await writeDailySpend(today)
    const rows = await prisma.walletTransaction.findMany({ where: { campaign_id: c.id }, orderBy: { occurred_at: "asc" } })
    expect(rows.map((r) => Number(r.amount_kes))).toEqual([-3333.33, -3333.33, -3333.34])
    expect(rows.every((r) => r.kind === "spend" && r.spend_category === "screen_time")).toBe(true)
  })

  it("notifies unspent budget for a flight that ended yesterday only", async () => {
    const make = (name: string, ends: string, budget: number) =>
      prisma.campaign.create({
        data: {
          clerk_user_id: tag, org_id: orgId, name: `${tag} ${name}`, budget_kes: budget, status: "approved",
          funded_at: new Date("2026-10-30"), starts_on: new Date("2026-10-25"), ends_on: new Date(ends),
        },
      })
    const yesterday = await make("ended-yesterday", "2026-11-03", 2000)
    await make("ended-earlier", "2026-11-02", 2000)
    const spent = await make("fully-spent", "2026-11-03", 500)
    await prisma.walletTransaction.create({
      data: {
        org_id: orgId, campaign_id: spent.id, kind: "spend", amount_kes: -500, provider: "manual",
        description: tag, occurred_at: new Date("2026-11-03T09:00:00Z"),
      },
    })

    await releaseCompletedCredit(today)
    const calls = notifyCreditReleased.mock.calls.map((call) => call[0]).filter((p) => p.orgId === orgId)
    // The "flight" campaign from the test above also ended yesterday but was fully spent.
    expect(calls).toEqual([
      expect.objectContaining({ amountKes: 2000, reason: "completed", campaign: { id: yesterday.id, name: `${tag} ended-yesterday` } }),
    ])
  })
})

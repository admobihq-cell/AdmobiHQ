import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { nairobiDay } from "@workspace/ops-contracts"

import { testDatabaseUrl } from "@/lib/test-database-url"
import { availableKes, dueNowKes, holdsFunds, lockOrg } from "./funding"

const databaseUrl = testDatabaseUrl()
const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * 86_400_000)
const today = nairobiDay(new Date())
const funded = new Date()

const c = (over: Partial<Parameters<typeof holdsFunds>[0]> = {}) => ({
  funded_at: funded,
  status: "submitted",
  starts_on: addDays(today, 1),
  ends_on: addDays(today, 10),
  ...over,
})

describe("holdsFunds", () => {
  it("holds for funded submitted, approved and changes_requested campaigns", () => {
    expect(holdsFunds(c())).toBe(true)
    expect(holdsFunds(c({ status: "approved" }))).toBe(true) // scheduled
    expect(holdsFunds(c({ status: "approved", starts_on: addDays(today, -3) }))).toBe(true) // live
    expect(holdsFunds(c({ status: "changes_requested" }))).toBe(true)
    expect(holdsFunds(c({ ends_on: null }))).toBe(true)
  })

  it("does not hold when unfunded, rejected, cancelled or finished", () => {
    expect(holdsFunds(c({ funded_at: null }))).toBe(false)
    expect(holdsFunds(c({ status: "rejected" }))).toBe(false)
    expect(holdsFunds(c({ status: "cancelled" }))).toBe(false)
    expect(holdsFunds(c({ status: "draft" }))).toBe(false)
    expect(holdsFunds(c({ status: "approved", ends_on: addDays(today, -1) }))).toBe(false)
  })

  it("still holds on the last flight day", () => {
    expect(holdsFunds(c({ status: "approved", ends_on: addDays(today, 0) }))).toBe(true)
  })

  it("reads today as a Nairobi day", () => {
    // 22:30 UTC on 9 Nov is already 10 Nov in Nairobi.
    const lateUtc = new Date("2026-11-09T22:30:00Z")
    expect(holdsFunds(c({ ends_on: new Date("2026-11-09") }), lateUtc)).toBe(false)
    expect(holdsFunds(c({ ends_on: new Date("2026-11-10") }), lateUtc)).toBe(true)
  })
})

describe("dueNowKes", () => {
  it("is the budget less available credit, plus anything the org owes, never negative", () => {
    expect(dueNowKes(50000, 12000.5)).toBe(37999.5)
    expect(dueNowKes(50000, 80000)).toBe(0)
    expect(dueNowKes(50000, -300)).toBe(50300)
  })
})

describe.skipIf(!databaseUrl)("availableKes", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `funding-test-${Date.now()}`
  let orgId = 0

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: tag } })).id
    const campaign = (name: string, over: object) =>
      prisma.campaign.create({
        data: { clerk_user_id: tag, org_id: orgId, name: `${tag} ${name}`, budget_kes: 60000, ...over },
      })
    await campaign("held", { status: "submitted", funded_at: funded })
    await campaign("draft", { status: "draft" })
    await prisma.walletTransaction.create({
      data: {
        org_id: orgId,
        kind: "top_up",
        amount_kes: 100000,
        provider: "manual",
        description: `${tag} top-up`,
        occurred_at: new Date(),
      },
    })
  }, 30_000)

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({ where: { description: { startsWith: tag } } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("is balance minus the unspent budget of funded campaigns only", async () => {
    await prisma.$transaction(async (tx) => {
      await lockOrg(tx, orgId)
      expect(await availableKes(tx, orgId)).toBe(40000)
    })
  })
})

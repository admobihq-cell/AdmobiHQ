import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
const tag = `driver-payouts-test-${Date.now()}`
let caller = `${tag}-me`

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireDriverAccess: vi.fn(async () => ({ access: { userId: caller } })),
}))

import { GET } from "./route"

describe.skipIf(!databaseUrl)("GET /v1/driver/payouts", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const ids: number[] = []

  beforeAll(async () => {
    const me = await prisma.driverProfile.create({ data: { clerk_user_id: `${tag}-me`, status: "approved" } })
    const other = await prisma.driverProfile.create({ data: { clerk_user_id: `${tag}-other`, status: "approved" } })
    ids.push(me.id, other.id)
    const thisYear = new Date().getUTCFullYear()
    await prisma.payout.createMany({
      data: [
        { driver_profile_id: me.id, amount_kes: 3000, status: "settled", period_month: new Date(Date.UTC(thisYear, 0, 1)), paid_at: new Date(Date.UTC(thisYear, 1, 3, 9)) },
        { driver_profile_id: me.id, amount_kes: 2500, status: "settled", period_month: new Date(Date.UTC(thisYear - 1, 11, 1)), paid_at: new Date(Date.UTC(thisYear - 1, 11, 20, 9)) },
        { driver_profile_id: me.id, amount_kes: 1200, status: "pending", period_month: new Date(Date.UTC(thisYear, 1, 1)) },
        { driver_profile_id: me.id, amount_kes: 800, status: "processing", period_month: new Date(Date.UTC(thisYear, 2, 1)) },
        { driver_profile_id: other.id, amount_kes: 9999, status: "settled", period_month: new Date(Date.UTC(thisYear, 0, 1)), paid_at: new Date() },
      ],
    })
  }, 30_000)

  afterAll(async () => {
    await prisma.payout.deleteMany({ where: { driver_profile_id: { in: ids } } })
    await prisma.driverProfile.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
  })

  it("returns only the caller's payouts with matching totals", async () => {
    caller = `${tag}-me`
    const body = await (await GET()).json()
    expect(body.items).toHaveLength(4)
    expect(body.items.every((p: { amountKes: number }) => p.amountKes !== 9999)).toBe(true)
    expect(body.summary).toEqual({
      lastPayout: { amountKes: 3000, paidAt: expect.any(String) },
      paidThisYearKes: 3000,
      pendingKes: 2000,
    })
  })

  it("is empty for a driver with no payouts", async () => {
    caller = `${tag}-nobody`
    const body = await (await GET()).json()
    expect(body).toEqual({ items: [], summary: { lastPayout: null, paidThisYearKes: 0, pendingKes: 0 } })
  })
})

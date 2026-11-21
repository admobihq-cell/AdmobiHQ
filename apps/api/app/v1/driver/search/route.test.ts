import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { SearchResponseDto } from "@workspace/ops-contracts"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()
const tag = `driver-search-test-${Date.now()}`
const caller = `${tag}-me`

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireDriverAccess: vi.fn(async () => ({ access: { userId: caller } })),
}))

import { GET } from "./route"

async function search(q: string): Promise<SearchResponseDto> {
  const res = await GET(new Request(`http://test/v1/driver/search?q=${encodeURIComponent(q)}`))
  expect(res.status).toBe(200)
  return (await res.json()) as SearchResponseDto
}

describe.skipIf(!databaseUrl)("GET /v1/driver/search", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const profileIds: number[] = []
  const payoutIds: number[] = []
  const caseIds: number[] = []

  beforeAll(async () => {
    for (const who of ["me", "other"]) {
      const profile = await prisma.driverProfile.create({ data: { clerk_user_id: `${tag}-${who}`, status: "approved" } })
      profileIds.push(profile.id)
      const payout = await prisma.payout.create({
        data: { driver_profile_id: profile.id, amount_kes: 1000, status: "settled", period_month: new Date(Date.UTC(2026, 0, 1)) },
      })
      payoutIds.push(payout.id)
      const supportCase = await prisma.supportCase.create({
        data: {
          contact_name: tag,
          contact_email: `${tag}@x.test`,
          channel: "driver-web",
          subject: `${tag} ${who} case`,
          access_token_hash: `${tag}-${who}`,
          driver_clerk_user_id: `${tag}-${who}`,
        },
      })
      caseIds.push(supportCase.id)
    }
  }, 30_000)

  afterAll(async () => {
    await prisma.payout.deleteMany({ where: { id: { in: payoutIds } } })
    await prisma.supportCase.deleteMany({ where: { id: { in: caseIds } } })
    await prisma.driverProfile.deleteMany({ where: { id: { in: profileIds } } })
    await prisma.$disconnect()
  })

  it("returns only the caller's payouts and cases", async () => {
    const mine = await search(String(payoutIds[0]))
    expect(mine.groups.find((g) => g.key === "payouts")!.hits[0]!.id).toBe(`payouts:${payoutIds[0]}`)

    const theirs = await search(String(payoutIds[1]))
    expect(theirs.groups.flatMap((g) => g.hits).map((h) => h.id)).not.toContain(`payouts:${payoutIds[1]}`)

    const cases = await search(tag)
    const ids = cases.groups.find((g) => g.key === "support")!.hits.map((h) => h.id)
    expect(ids).toEqual([`support:${caseIds[0]}`])
  })
})

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"
import { GET } from "./route"

const databaseUrl = testDatabaseUrl()

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async () => ({
      access: { userId: "ops_ann_1", email: "ops@admobihq.com" },
    })),
  }
})

describe.skipIf(!databaseUrl)("GET /v1/notifications search", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `ann-search-${Date.now()}`
  let firstId = 0

  beforeAll(async () => {
    const base = { body: "Body", sent_by_clerk_id: tag, sent_by_email: "ops@admobihq.com" }
    firstId = (await prisma.announcementBroadcast.create({ data: { ...base, title: `${tag}-alpha` } })).id
    await prisma.announcementBroadcast.create({ data: { ...base, title: `${tag}-beta` } })
  }, 30_000)

  afterAll(async () => {
    await prisma.announcementBroadcast.deleteMany({ where: { sent_by_clerk_id: tag } })
    await prisma.$disconnect()
  })

  it("search narrows broadcasts by title", async () => {
    const res = await GET(new Request(`http://localhost/v1/notifications?search=${tag}-alpha`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.map((i: { id: number }) => i.id)).toEqual([firstId])
    expect(body.total).toBe(1)
  })
})

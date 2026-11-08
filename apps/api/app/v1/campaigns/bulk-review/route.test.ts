import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { auditFromOpsUser } from "@/lib/audit"
import { sendEmail } from "@/lib/email/send-email"
import { testDatabaseUrl } from "@/lib/test-database-url"
import { POST } from "./route"

const databaseUrl = testDatabaseUrl()

let allowed = true

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async (permission: string) =>
      allowed
        ? { access: { userId: "ops_bulk_1", email: "ops@admobihq.com" } }
        : {
            error: new Response(JSON.stringify({ error: `Forbidden — "${permission}"` }), {
              status: 403,
            }),
          },
    ),
  }
})

vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn(async () => undefined) }))
vi.mock("@/lib/email/render-template", () => ({ renderTemplate: vi.fn(async () => "<p>x</p>") }))
vi.mock("@/lib/advertiser/advertiser-notify", () => ({
  fanOutCustomerCampaignNotice: vi.fn(async () => undefined),
}))
vi.mock("@/lib/payments/money-notify", () => ({ notifyCreditReleased: vi.fn(async () => undefined) }))

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/v1/campaigns/bulk-review", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )

describe.skipIf(!databaseUrl)("POST /v1/campaigns/bulk-review", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `bulk-review-${Date.now()}`
  let orgId = 0

  const seed = (status: string) =>
    prisma.campaign
      .create({
        data: {
          clerk_user_id: tag,
          org_id: orgId,
          name: `${tag} ${status}`,
          status,
          contact_name: "Tester",
          contact_email: `${tag}@example.com`,
        },
      })
      .then((c) => c.id)

  const statusOf = async (id: number) =>
    (await prisma.campaign.findUniqueOrThrow({ where: { id } })).status

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} org` } })).id
  }, 30_000)

  beforeEach(() => {
    allowed = true
    vi.mocked(auditFromOpsUser).mockClear()
    vi.mocked(sendEmail).mockReset()
    vi.mocked(sendEmail).mockResolvedValue(undefined as never)
  })

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("approves only submitted campaigns and skips the rest", async () => {
    const [s1, s2, approved, rejected] = [
      await seed("submitted"),
      await seed("submitted"),
      await seed("approved"),
      await seed("rejected"),
    ]
    const res = await post({ ids: [s1, s2, approved, rejected], decision: "approved" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toEqual([s1, s2])
    expect(body.skipped.map((s: { id: number }) => s.id)).toEqual([approved, rejected])
    expect(await statusOf(s1)).toBe("approved")
    expect(await statusOf(s2)).toBe("approved")
    expect(await statusOf(rejected)).toBe("rejected")
  })

  it("never walks back an approved campaign", async () => {
    const approved = await seed("approved")
    const res = await post({ ids: [approved], decision: "rejected", reason: "x" })
    const body = await res.json()
    expect(body.skipped.map((s: { id: number }) => s.id)).toEqual([approved])
    expect(await statusOf(approved)).toBe("approved")
  })

  it("requires a reason to reject", async () => {
    const s1 = await seed("submitted")
    expect((await post({ ids: [s1], decision: "rejected" })).status).toBe(400)
    expect((await post({ ids: [s1], decision: "rejected", reason: "   " })).status).toBe(400)
    expect(await statusOf(s1)).toBe("submitted")
  })

  it("rejects more than 100 ids", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1)
    expect((await post({ ids, decision: "approved" })).status).toBe(400)
  })

  it("dedupes ids", async () => {
    const s1 = await seed("submitted")
    const body = await (await post({ ids: [s1, s1], decision: "approved" })).json()
    expect(body.updated).toEqual([s1])
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it("keeps going when one email fails", async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("smtp down"))
    const [s1, s2] = [await seed("submitted"), await seed("submitted")]
    const body = await (await post({ ids: [s1, s2], decision: "approved" })).json()
    expect(body.updated).toEqual([s1, s2])
  })

  it("writes one audit row per updated campaign", async () => {
    const [s1, s2, approved] = [
      await seed("submitted"),
      await seed("submitted"),
      await seed("approved"),
    ]
    const body = await (await post({ ids: [s1, s2, approved], decision: "rejected", reason: "Off-brand" })).json()
    expect(body.updated).toEqual([s1, s2])
    expect(auditFromOpsUser).toHaveBeenCalledTimes(2)
  })

  it("requires the campaigns permission", async () => {
    allowed = false
    const s1 = await seed("submitted")
    expect((await post({ ids: [s1], decision: "approved" })).status).toBe(403)
    expect(await statusOf(s1)).toBe("submitted")
  })
})

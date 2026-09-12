import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { isAdvertiserVisibleActivity, toAdvertiserActivityItem } from "@/lib/advertiser-activity"

const databaseUrl = process.env.DATABASE_URL

let actingUserId = ""
let actingOrgId = 0
let actingIsOwner = true
let actingPermissions = new Set<string>(["activity:read"])

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerPermissionAccess: vi.fn(async (permission: string) => {
      if (!actingIsOwner && !actingPermissions.has(permission)) {
        return {
          error: new Response(
            JSON.stringify({ error: `Forbidden — "${permission}" access required` }),
            { status: 403 },
          ),
        }
      }
      return {
        access: {
          userId: actingUserId,
          orgId: actingOrgId,
          isOwner: actingIsOwner,
          permissions: actingPermissions,
        },
      }
    }),
  }
})

vi.mock("@/lib/customer-clerk", () => ({
  getCustomerEmail: vi.fn(async () => "actor@example.com"),
  getCustomerName: vi.fn(async () => "Ada"),
}))

describe("advertiser activity allowlist", () => {
  it("allows known triples and rejects unknown ones", () => {
    expect(
      isAdvertiserVisibleActivity({
        actor_type: "customer",
        action: "create",
        entity_type: "campaign",
      }),
    ).toBe(true)
    expect(
      isAdvertiserVisibleActivity({
        actor_type: "ops_user",
        action: "create",
        entity_type: "announcement",
      }),
    ).toBe(false)
  })
})

describe.skipIf(!databaseUrl)("GET /v1/customer/org/activity", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const userId = `activity-owner-${stamp}`
  let orgId = 0
  let otherOrgId = 0
  const eventIds: number[] = []

  beforeAll(async () => {
    const org = await prisma.advertiserOrg.create({ data: { name: "Activity Org" } })
    const other = await prisma.advertiserOrg.create({ data: { name: "Other Org" } })
    orgId = org.id
    otherOrgId = other.id
    await prisma.advertiserMember.create({
      data: { org_id: orgId, clerk_user_id: userId, is_owner: true },
    })
    actingUserId = userId
    actingOrgId = orgId

    const campaign = await prisma.campaign.create({
      data: {
        clerk_user_id: userId,
        org_id: orgId,
        name: "Feed Campaign",
        status: "approved",
        review_reason: "Looks good for Nairobi corridors",
      },
    })

    const visible = await prisma.auditEvent.create({
      data: {
        app: "api",
        actor_type: "ops_user",
        actor_user_id: "ops_1",
        actor_email: "ops@admobihq.com",
        action: "update",
        entity_type: "campaign",
        entity_id: String(campaign.id),
        org_id: orgId,
        summary: "INTERNAL: do not show this prose to advertisers",
      },
    })
    eventIds.push(visible.id)

    const otherOrgEvent = await prisma.auditEvent.create({
      data: {
        app: "api",
        actor_type: "customer",
        actor_user_id: "stranger",
        action: "create",
        entity_type: "campaign",
        entity_id: "999",
        org_id: otherOrgId,
        summary: "Should never appear",
      },
    })
    eventIds.push(otherOrgEvent.id)

    const disallowed = await prisma.auditEvent.create({
      data: {
        app: "api",
        actor_type: "ops_user",
        actor_user_id: "ops_1",
        actor_email: "ops@admobihq.com",
        action: "create",
        entity_type: "announcement",
        entity_id: "1",
        org_id: orgId,
        summary: "Also internal",
      },
    })
    eventIds.push(disallowed.id)
  }, 30_000)

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { id: { in: eventIds } } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: userId } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } })
    await prisma.$disconnect()
  })

  it(
    "returns only allowlisted events for this org, masking ops identity and summary",
    async () => {
      const { GET } = await import("../app/v1/customer/org/activity/route")
      const res = await GET(new Request("http://localhost/v1/customer/org/activity"))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items.length).toBeGreaterThanOrEqual(1)
      const ids = body.items.map((i: { id: number }) => i.id)
      expect(ids).toContain(eventIds[0])
      expect(ids).not.toContain(eventIds[1])
      expect(ids).not.toContain(eventIds[2])

      const review = body.items.find((i: { id: number }) => i.id === eventIds[0])
      expect(review.actorLabel).toBe("Admobi review team")
      expect(review.detail).toBe("Looks good for Nairobi corridors")
      expect(JSON.stringify(review)).not.toContain("ops@admobihq.com")
      expect(JSON.stringify(review)).not.toContain("INTERNAL")
      expect(review).not.toHaveProperty("actor_email")
      expect(review).not.toHaveProperty("summary")
    },
    30_000,
  )

  it(
    "returns 403 for Member without activity:read",
    async () => {
      actingIsOwner = false
      actingPermissions = new Set(["campaigns:read"])
      const { GET } = await import("../app/v1/customer/org/activity/route")
      const res = await GET(new Request("http://localhost/v1/customer/org/activity"))
      expect(res.status).toBe(403)
      actingIsOwner = true
      actingPermissions = new Set(["activity:read"])
    },
    30_000,
  )

  it("masks ops actors in the DTO builder", async () => {
    const item = await toAdvertiserActivityItem({
      id: 1,
      actor_type: "ops_user",
      actor_user_id: "ops_1",
      action: "update",
      entity_type: "campaign",
      entity_id: null,
      created_at: new Date(),
    })
    expect(item.actorLabel).toBe("Admobi review team")
    expect(item).not.toHaveProperty("actor_email")
  })
})

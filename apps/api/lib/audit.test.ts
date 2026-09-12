import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/customer-clerk", () => ({
  getCustomerEmail: vi.fn(async () => "advertiser@example.com"),
}))

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("audit org_id stamping", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const createdUserIds: string[] = []
  const createdEventIds: number[] = []

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { id: { in: createdEventIds } } })
    // Delete orgs FIRST, while their members still exist to match this
    // relational filter — AdvertiserMember.org has onDelete: Cascade, so
    // this also removes the member rows. Deleting members first would make
    // this filter match zero orgs (their only member is already gone) and
    // silently leak an AdvertiserOrg row on every run.
    await prisma.advertiserOrg.deleteMany({ where: { members: { some: { clerk_user_id: { in: createdUserIds } } } } })
    await prisma.$disconnect()
  })

  it("auditFromCustomerUser stamps org_id from the actor's membership", async () => {
    const userId = `audit-test-${Date.now()}`
    createdUserIds.push(userId)
    const org = await prisma.advertiserOrg.create({ data: { name: "Audit Test Org" } })
    await prisma.advertiserMember.create({ data: { org_id: org.id, clerk_user_id: userId, is_owner: true } })

    const { auditFromCustomerUser } = await import("./audit")
    await auditFromCustomerUser(userId, {
      action: "create",
      entity_type: "campaign",
      entity_id: 999,
      summary: "test event",
    })

    const event = await prisma.auditEvent.findFirst({
      where: { actor_user_id: userId },
      orderBy: { id: "desc" },
    })
    expect(event).not.toBeNull()
    createdEventIds.push(event!.id)
    expect(event!.org_id).toBe(org.id)
  }, 30_000)

  it("auditFromCustomerUser stamps a null org_id when the actor has no membership", async () => {
    const userId = `audit-test-no-org-${Date.now()}`

    const { auditFromCustomerUser } = await import("./audit")
    await auditFromCustomerUser(userId, {
      action: "create",
      entity_type: "campaign",
      entity_id: 998,
      summary: "test event without org",
    })

    const event = await prisma.auditEvent.findFirst({
      where: { actor_user_id: userId },
      orderBy: { id: "desc" },
    })
    expect(event).not.toBeNull()
    createdEventIds.push(event!.id)
    expect(event!.org_id).toBeNull()
  }, 30_000)

  it("auditFromOpsUser stamps org_id when provided", async () => {
    const org = await prisma.advertiserOrg.create({ data: { name: "Audit Test Ops Org" } })

    const { auditFromOpsUser } = await import("./audit")
    const opsAccess = {
      status: "authorized" as const,
      userId: "ops-test-user",
      email: "ops@example.com",
      role: "admin" as const,
      permissions: [],
      user: {} as never,
    }

    await auditFromOpsUser(opsAccess, {
      action: "update",
      entity_type: "campaign",
      entity_id: 997,
      org_id: org.id,
      summary: "ops reviewed campaign",
    })

    const event = await prisma.auditEvent.findFirst({
      where: { actor_email: "ops@example.com" },
      orderBy: { id: "desc" },
    })
    expect(event).not.toBeNull()
    createdEventIds.push(event!.id)
    expect(event!.org_id).toBe(org.id)

    // Clean up: delete org (which cascades to delete any members)
    await prisma.advertiserOrg.deleteMany({ where: { id: org.id } })
  }, 30_000)
})

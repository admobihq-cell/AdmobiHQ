import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const databaseUrl = process.env.DATABASE_URL
const testPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) })

vi.mock("@/lib/customer-clerk", () => ({
  defaultOrgName: vi.fn(async (clerkUserId: string) =>
    clerkUserId === "empty-org-owner" ? "Victor's Organization" : "My Organization",
  ),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: testPrisma,
}))

vi.mock("@/lib/load-env", () => ({}))

describe.skipIf(!databaseUrl)("backfillEmptyOrgNames", () => {
  const prisma = testPrisma
  let namedOrgId: number
  let emptyOrgId: number
  let ownerlessOrgId: number

  beforeAll(async () => {
    ;({ id: namedOrgId } = await prisma.advertiserOrg.create({ data: { name: "Already Named Co" } }))
    ;({ id: emptyOrgId } = await prisma.advertiserOrg.create({ data: { name: "" } }))
    await prisma.advertiserMember.create({
      data: { org_id: emptyOrgId, clerk_user_id: "empty-org-owner", is_owner: true },
    })
    // An empty-named org whose only owner has left — should be skipped, not guessed at.
    ;({ id: ownerlessOrgId } = await prisma.advertiserOrg.create({ data: { name: "" } }))
    await prisma.advertiserMember.create({
      data: {
        org_id: ownerlessOrgId,
        clerk_user_id: "ownerless-org-former-owner",
        is_owner: true,
        removed_at: new Date(),
      },
    })
  })

  afterAll(async () => {
    await prisma.advertiserMember.deleteMany({
      where: { org_id: { in: [emptyOrgId, ownerlessOrgId] } },
    })
    await prisma.advertiserOrg.deleteMany({
      where: { id: { in: [namedOrgId, emptyOrgId, ownerlessOrgId] } },
    })
    await prisma.$disconnect()
  })

  it("renames empty-named orgs from their owner, skips ones with no owner, leaves named orgs alone", async () => {
    const { backfillEmptyOrgNames } = await import("./backfill-empty-org-names")
    const result = await backfillEmptyOrgNames()

    expect(result.orgsRenamed).toBe(1)
    expect(result.orgsSkipped).toBe(1)

    const named = await prisma.advertiserOrg.findUnique({ where: { id: namedOrgId } })
    expect(named?.name).toBe("Already Named Co")

    const renamed = await prisma.advertiserOrg.findUnique({ where: { id: emptyOrgId } })
    expect(renamed?.name).toBe("Victor's Organization")

    const skipped = await prisma.advertiserOrg.findUnique({ where: { id: ownerlessOrgId } })
    expect(skipped?.name).toBe("")
  })

  it("is idempotent: running it again renames nothing further", async () => {
    const { backfillEmptyOrgNames } = await import("./backfill-empty-org-names")
    const result = await backfillEmptyOrgNames()
    expect(result.orgsRenamed).toBe(0)
    expect(result.orgsSkipped).toBe(1)
  })
})

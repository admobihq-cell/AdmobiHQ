import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, describe, expect, it } from "vitest"

import { seedAdvertiserStarterRoles } from "./seed-advertiser-roles"

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("seedAdvertiserStarterRoles", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("creates exactly one row per starter role, and is idempotent", async () => {
    await seedAdvertiserStarterRoles()
    await seedAdvertiserStarterRoles() // run twice on purpose

    const roles = await prisma.advertiserRole.findMany({ where: { org_id: null } })
    const byName = new Map(roles.map((r) => [r.name, r]))

    expect(byName.size).toBe(1)
    expect(byName.get("Member")?.permissions).not.toContain("campaigns:submit")
  }, 30_000)
})

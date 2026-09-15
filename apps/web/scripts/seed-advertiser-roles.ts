import { fileURLToPath } from "node:url"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

import { ADVERTISER_STARTER_ROLES } from "@workspace/ops-contracts"

// This Prisma version requires an explicit driver adapter — plain
// `new PrismaClient()` throws. Mirrors apps/api/lib/prisma.ts, minus the
// shared-pool singleton machinery this one-off script doesn't need.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

/** Idempotent: guards on org_id IS NULL AND name = $1 (a manual upsert)
 * rather than relying on Prisma's upsert-by-unique-key, because
 * @@unique([org_id, name]) does not catch NULL org_id duplicates on its
 * own — see the partial unique index added in the schema migration. */
export async function seedAdvertiserStarterRoles(): Promise<void> {
  for (const [name, permissions] of Object.entries(ADVERTISER_STARTER_ROLES)) {
    const existing = await prisma.advertiserRole.findFirst({
      where: { org_id: null, name },
    })
    if (existing) {
      await prisma.advertiserRole.update({
        where: { id: existing.id },
        data: { permissions: [...permissions] },
      })
    } else {
      await prisma.advertiserRole.create({
        data: { org_id: null, name, permissions: [...permissions] },
      })
    }
  }
}

// file://-URL vs. process.argv[1]'s native path never match on Windows
// (backslashes vs. the URL's forward slashes) — normalize through
// fileURLToPath instead of a raw string comparison.
const isMain = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  seedAdvertiserStarterRoles()
    .then(() => console.log("Seeded advertiser starter roles."))
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}

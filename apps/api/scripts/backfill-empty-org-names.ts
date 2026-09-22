import "@/lib/load-env"

import { defaultOrgName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"
import { fileURLToPath } from "node:url"

/**
 * One-off, idempotent: fixes AdvertiserOrg rows stuck with name: "" from
 * before backfill-advertiser-orgs.ts picked up defaultOrgName() — the
 * historical run used an empty string instead. Only touches rows still
 * exactly "", so a re-run after this ships is a no-op.
 */
export async function backfillEmptyOrgNames(): Promise<{ orgsRenamed: number; orgsSkipped: number }> {
  const orgs = await prisma.advertiserOrg.findMany({
    where: { name: "" },
    include: { members: { where: { is_owner: true, removed_at: null }, take: 1 } },
  })

  let orgsRenamed = 0
  let orgsSkipped = 0

  for (const org of orgs) {
    const owner = org.members[0]
    if (!owner) {
      // No owner to derive a name from (org left over from a deleted/removed
      // owner) — leave it for manual cleanup rather than guessing.
      orgsSkipped++
      continue
    }
    const name = await defaultOrgName(owner.clerk_user_id)
    await prisma.advertiserOrg.update({ where: { id: org.id }, data: { name } })
    orgsRenamed++
  }

  return { orgsRenamed, orgsSkipped }
}

const isMain = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  ;(async () => {
    try {
      const { orgsRenamed, orgsSkipped } = await backfillEmptyOrgNames()
      console.log(`Renamed ${orgsRenamed} advertiser orgs.`)
      if (orgsSkipped > 0) {
        console.error(`WARNING: ${orgsSkipped} empty-named orgs have no owner and were skipped.`)
        process.exitCode = 1
      }
    } catch (error) {
      console.error(error)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
    }
  })()
}

import "@/lib/load-env"

import { customerClerkClient, defaultOrgName, readCompanyName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"
import { fileURLToPath } from "node:url"

const PAGE_SIZE = 100

/**
 * One-off, idempotent: for every customer Clerk user with no AdvertiserMember
 * row yet, creates an org (named from their Clerk company metadata, falling
 * back to the same "<FirstName>'s Organization" / "My Organization" default
 * lazy bootstrap uses) and an owner membership, then points their campaigns
 * at it. Safe to run more than once — a user who already has a membership
 * gets no new org, though an owner's org-less campaigns are still adopted
 * (see below).
 */
export async function backfillAdvertiserOrgs(): Promise<{
  orgsCreated: number
  orphanedCampaignIds: number[]
}> {
  let orgsCreated = 0
  let offset = 0

  for (;;) {
    const { data: users } = await customerClerkClient.users.getUserList({ limit: PAGE_SIZE, offset })
    if (users.length === 0) break

    for (const user of users) {
      const existing = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: user.id } })
      if (existing) {
        // Lazy bootstrap got here first (they used the app between deploy and
        // backfill) and gave them an empty org. Adopt their pre-org campaigns
        // into the org they own — never into a team they joined as a member.
        // One-shot deploy tool: a much later re-run would also sweep in
        // campaigns someone deliberately left behind when joining a team.
        if (existing.is_owner && !existing.removed_at) {
          await prisma.campaign.updateMany({
            where: { clerk_user_id: user.id, org_id: null },
            data: { org_id: existing.org_id },
          })
        }
        continue
      }

      const name = readCompanyName(user) ?? (await defaultOrgName(user.id))
      await prisma.$transaction(async (tx) => {
        const org = await tx.advertiserOrg.create({ data: { name } })
        await tx.advertiserMember.create({
          data: { org_id: org.id, clerk_user_id: user.id, is_owner: true },
        })
        await tx.campaign.updateMany({
          where: { clerk_user_id: user.id },
          data: { org_id: org.id },
        })
      })
      orgsCreated++
    }

    offset += users.length
  }

  const orphaned = await prisma.campaign.findMany({ where: { org_id: null }, select: { id: true } })
  return { orgsCreated, orphanedCampaignIds: orphaned.map((c) => c.id) }
}

const isMain = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  ;(async () => {
    try {
      const { orgsCreated, orphanedCampaignIds } = await backfillAdvertiserOrgs()
      console.log(`Created ${orgsCreated} advertiser orgs.`)
      if (orphanedCampaignIds.length > 0) {
        console.error(`WARNING: ${orphanedCampaignIds.length} campaigns still have no org_id:`, orphanedCampaignIds)
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

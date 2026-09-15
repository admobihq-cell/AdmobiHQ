import "@/lib/load-env"

import { customerClerkClient, readCompanyName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"
import { fileURLToPath } from "node:url"

const PAGE_SIZE = 100

/**
 * One-off, idempotent: for every customer Clerk user with no AdvertiserMember
 * row yet, creates an org (named from their Clerk company metadata, empty if
 * unset) and an owner membership, then points their campaigns at it. Safe to
 * run more than once — a user who already has a membership is skipped.
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
      if (existing) continue

      const name = readCompanyName(user) ?? ""
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

import { readFileSync } from "node:fs"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

/**
 * Runs the real backfill script against the dev database. It inserts creatives
 * the way the pre-library API wrote them (file columns on the row, no
 * media_asset_id) and checks they come out linked to an asset owned by their
 * campaign's org. Deleted together with the legacy columns in the contract step.
 */
const databaseUrl = testDatabaseUrl()

// cwd is apps/api.
const BACKFILL_SQL = readFileSync("../web/prisma/scripts/media-library-backfill.sql", "utf8")

type LinkedRow = {
  campaign_id: number
  org_id: number | null
  name: string
  created_by_clerk_user_id: string
  cloudinary_public_id: string
}

describe.skipIf(!databaseUrl)("media library backfill", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const userId = `media-backfill-${stamp}`
  const prefix = `backfill-test/${stamp}`
  let orgId = 0
  let campaignId = 0
  let orphanCampaignId = 0

  async function insertLegacyCreative(campaign: number, suffix: string, filename: string | null) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO campaign_creatives
         (campaign_id, resource_type, cloudinary_public_id, content_type, size_bytes, width, height, original_filename)
       VALUES ($1, 'image', $2, 'image/png', 1000, 960, 320, $3)`,
      campaign,
      `${prefix}/${suffix}`,
      filename,
    )
  }

  function linkedRows() {
    return prisma.$queryRawUnsafe<LinkedRow[]>(
      `SELECT cc.campaign_id, ma.org_id, ma.name, ma.created_by_clerk_user_id, ma.cloudinary_public_id
       FROM campaign_creatives cc
       JOIN media_assets ma ON ma.id = cc.media_asset_id
       WHERE cc.campaign_id IN ($1, $2)
       ORDER BY cc.id`,
      campaignId,
      orphanCampaignId,
    )
  }

  async function assetCount(): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM media_assets WHERE cloudinary_public_id LIKE $1`,
      `${prefix}/%`,
    )
    return rows[0]!.n
  }

  beforeAll(async () => {
    const org = await prisma.advertiserOrg.create({ data: { name: "Backfill Org" } })
    orgId = org.id
    const campaign = await prisma.campaign.create({
      data: { clerk_user_id: userId, org_id: orgId, name: "Backfill Campaign" },
    })
    campaignId = campaign.id
    const orphan = await prisma.campaign.create({
      data: { clerk_user_id: userId, org_id: null, name: "Backfill Orphan" },
    })
    orphanCampaignId = orphan.id

    await insertLegacyCreative(campaignId, "a", "taxi.png")
    await insertLegacyCreative(campaignId, "b", null)
    await insertLegacyCreative(orphanCampaignId, "c", "orphan.png")
  }, 60_000)

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { clerk_user_id: userId } })
    await prisma.$executeRawUnsafe(
      `DELETE FROM media_assets WHERE cloudinary_public_id LIKE $1`,
      `${prefix}/%`,
    )
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("links every legacy creative to an asset owned by its campaign's org", async () => {
    await prisma.$executeRawUnsafe(BACKFILL_SQL)

    const rows = await linkedRows()
    expect(rows).toHaveLength(3)

    expect(rows[0]).toMatchObject({
      campaign_id: campaignId,
      org_id: orgId,
      name: "taxi.png",
      created_by_clerk_user_id: userId,
      cloudinary_public_id: `${prefix}/a`,
    })
    // No filename to name it after.
    expect(rows[1]!.name).toMatch(/^Creative \d+$/)
    // A campaign with no org yields an org-less asset that is still attached.
    expect(rows[2]).toMatchObject({ campaign_id: orphanCampaignId, org_id: null })
  }, 60_000)

  it("is idempotent, and picks up a creative written after the first run", async () => {
    const before = await assetCount()
    await prisma.$executeRawUnsafe(BACKFILL_SQL)
    expect(await assetCount()).toBe(before)

    // What the old API does if someone uploads between the first backfill and
    // the deploy going live.
    await insertLegacyCreative(campaignId, "late", "late.png")
    await prisma.$executeRawUnsafe(BACKFILL_SQL)
    expect(await assetCount()).toBe(before + 1)
    expect(await linkedRows()).toHaveLength(4)
  }, 60_000)
})

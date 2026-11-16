import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

import { assertDevDatabase, DEMO_CAMPAIGN_NOTES, guardedDatabaseUrl, planOrgDemo, seedDemoData } from "./seed-demo-data"

const DEV = "postgresql://u:p@ep-sparkling-waterfall-abc-pooler.eu.aws.neon.tech/db"
const PROD = "postgresql://u:p@ep-winter-rain-abc-pooler.eu.aws.neon.tech/db"

describe("assertDevDatabase", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("allows the dev branch, pooled or direct, and localhost", () => {
    expect(() => assertDevDatabase("postgresql://u:p@ep-sparkling-waterfall-abc.eu.aws.neon.tech/db")).not.toThrow()
    expect(() =>
      assertDevDatabase("postgresql://u:p@ep-sparkling-waterfall-abc-pooler.eu.aws.neon.tech/db"),
    ).not.toThrow()
    expect(() => assertDevDatabase("postgresql://u:p@localhost:5432/db")).not.toThrow()
  })

  it("refuses prod, unknown hosts, junk and undefined", () => {
    for (const url of [
      "postgresql://u:p@ep-winter-rain-abc-pooler.eu.aws.neon.tech/db",
      "postgresql://u:p@other.neon.tech/db",
      "not a url",
      "",
      undefined,
    ]) {
      expect(() => assertDevDatabase(url)).toThrow(/refusing/i)
    }
  })

  it("refuses a dev-looking prefix on a host outside Neon", () => {
    expect(() => assertDevDatabase("postgresql://u:p@ep-sparkling-waterfall-x.attacker.example/db")).toThrow(
      /refusing/i,
    )
  })

  it("refuses whichever of DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL resolves", () => {
    vi.stubEnv("DATABASE_URL", PROD)
    vi.stubEnv("POSTGRES_URL", DEV)
    vi.stubEnv("POSTGRES_PRISMA_URL", DEV)
    expect(() => guardedDatabaseUrl()).toThrow(/refusing/i)

    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("POSTGRES_URL", PROD)
    expect(() => guardedDatabaseUrl()).toThrow(/refusing/i)

    vi.stubEnv("POSTGRES_URL", "")
    vi.stubEnv("POSTGRES_PRISMA_URL", PROD)
    expect(() => guardedDatabaseUrl()).toThrow(/refusing/i)

    vi.stubEnv("POSTGRES_PRISMA_URL", "")
    expect(() => guardedDatabaseUrl()).toThrow(/refusing/i)

    vi.stubEnv("POSTGRES_PRISMA_URL", DEV)
    expect(guardedDatabaseUrl()).toBe(DEV)
  })

  it("seedDemoData refuses prod before it ever connects", async () => {
    vi.stubEnv("DATABASE_URL", PROD)
    await expect(seedDemoData()).rejects.toThrow(/refusing/i)
  })
})

describe("planOrgDemo", () => {
  it("wallet history reconciles and every spend row has a category", () => {
    const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
    expect(plan.transactions.reduce((t, x) => t + x.amount_kes, 0)).toBeGreaterThan(0)
    expect(plan.transactions.filter((t) => t.kind === "spend").every((t) => t.amount_kes < 0 && t.spend_category)).toBe(
      true,
    )
  })

  it("never lets the running balance go negative", () => {
    for (const shortOfFunds of [false, true]) {
      const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42, { shortOfFunds })
      let balance = 0
      for (const t of [...plan.transactions].sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime())) {
        balance += t.amount_kes
        expect(balance).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("leaves a short-of-funds org with less than it has committed, and others with more", () => {
    const today = new Date("2026-11-01")
    const healthy = planOrgDemo(1, "user_1", today, 42)
    const short = planOrgDemo(2, "user_2", today, 42, { shortOfFunds: true })
    expect(healthy.balanceKes).toBeGreaterThan(healthy.committedKes)
    expect(short.balanceKes).toBeGreaterThan(0)
    expect(short.balanceKes).toBeLessThan(short.committedKes)
  })

  it("refund rows carry the category they refund", () => {
    const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
    const refunds = plan.transactions.filter((t) => t.kind === "refund")
    expect(refunds.length).toBeGreaterThan(0)
    expect(refunds.every((t) => t.amount_kes > 0 && t.spend_category)).toBe(true)
  })

  it("stats keys are unique, and delivered + missed = scheduled", () => {
    const { stats } = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
    expect(new Set(stats.map((s) => [s.campaign_id, s.day, s.market, s.daypart, s.format].join())).size).toBe(
      stats.length,
    )
    expect(stats.every((s) => s.plays_delivered - s.plays_over + s.plays_missed === s.plays_scheduled)).toBe(true)
    expect(
      stats.every((s) => s.impressions_low! <= s.impressions_likely! && s.impressions_likely! <= s.impressions_high!),
    ).toBe(true)
  })

  it("covers every health state and at least two measurement sources", () => {
    const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
    expect(new Set(plan.campaigns.map((c) => c.demoState))).toEqual(
      new Set(["healthy", "under_delivering", "changes_requested", "ending_soon", "completed", "no_creative"]),
    )
    expect(new Set(plan.stats.map((s) => s.source)).size).toBeGreaterThan(1)
  })

  it("writes creative rows only for campaigns that have creative", () => {
    const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
    const withCreative = new Set(plan.campaigns.flatMap((c, i) => (c.creativeNames.length > 0 ? [i] : [])))
    expect(plan.creativeStats.length).toBeGreaterThan(0)
    expect(plan.creativeStats.every((r) => withCreative.has(r.campaign_id))).toBe(true)
  })

  it("keeps reach around impressions ÷ 3–6 and never sums it", () => {
    const plan = planOrgDemo(1, "user_1", new Date("2026-11-01"), 42)
    expect(plan.reach.length).toBeGreaterThan(0)
    for (const r of plan.reach) {
      const toDate = plan.stats
        .filter((s) => s.campaign_id === r.campaign_id && s.day <= r.as_of)
        .reduce((t, s) => t + (s.impressions_likely ?? 0), 0)
      expect(toDate / r.reach_likely).toBeGreaterThanOrEqual(3)
      expect(toDate / r.reach_likely).toBeLessThanOrEqual(6)
      expect(r.reach_low).toBeLessThanOrEqual(r.reach_likely)
      expect(r.reach_likely).toBeLessThanOrEqual(r.reach_high)
    }
  })

  it("is deterministic", () => {
    const today = new Date("2026-11-01")
    expect(planOrgDemo(1, "u", today, 42)).toEqual(planOrgDemo(1, "u", today, 42))
  })
})

const databaseUrl = testDatabaseUrl()

describe.skipIf(!databaseUrl)("seedDemoData against the test database", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) })
  const ownerClerkId = "seed-demo-test-owner"
  let orgId = 0
  let realCampaignId = 0
  let realTransactionId = 0

  async function orgDemoCounts() {
    return {
      campaigns: await prisma.campaign.count({ where: { org_id: orgId, notes: DEMO_CAMPAIGN_NOTES } }),
      stats: await prisma.campaignDailyStat.count({ where: { is_demo: true, campaign: { org_id: orgId } } }),
      transactions: await prisma.walletTransaction.count({ where: { is_demo: true, org_id: orgId } }),
      invoices: await prisma.invoice.count({ where: { is_demo: true, org_id: orgId } }),
    }
  }

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!)
    const org = await prisma.advertiserOrg.create({ data: { name: "Seed demo test org" } })
    orgId = org.id
    await prisma.advertiserMember.create({ data: { org_id: orgId, clerk_user_id: ownerClerkId, is_owner: true } })
    realCampaignId = (
      await prisma.campaign.create({ data: { clerk_user_id: ownerClerkId, org_id: orgId, name: "Real campaign" } })
    ).id
    realTransactionId = (
      await prisma.walletTransaction.create({
        data: {
          org_id: orgId,
          kind: "top_up",
          amount_kes: 1000,
          provider: "manual",
          reference: `seed-demo-test-real-${orgId}`,
          description: "Real top-up",
          occurred_at: new Date(),
        },
      })
    ).id
  }, 60_000)

  afterAll(async () => {
    vi.unstubAllEnvs()
    if (orgId) {
      await prisma.campaignDailyStat.deleteMany({ where: { campaign: { org_id: orgId } } })
      await prisma.walletTransaction.deleteMany({ where: { org_id: orgId } })
      await prisma.invoice.deleteMany({ where: { org_id: orgId } })
      await prisma.campaign.deleteMany({ where: { org_id: orgId } })
      await prisma.advertiserMember.deleteMany({ where: { org_id: orgId } })
      await prisma.advertiserOrg.delete({ where: { id: orgId } })
    }
    await prisma.$disconnect()
  }, 60_000)

  it("re-running leaves the same row count and removes nothing real", async () => {
    const first = await seedDemoData({ orgId })
    const afterFirst = await orgDemoCounts()
    const second = await seedDemoData({ orgId })
    const afterSecond = await orgDemoCounts()

    expect(second.counts).toEqual(first.counts)
    expect(afterSecond).toEqual(afterFirst)
    expect(afterFirst.campaigns).toBe(first.counts.campaigns)
    expect(afterFirst.stats).toBe(first.counts.campaign_daily_stats)
    expect(await prisma.campaign.findUnique({ where: { id: realCampaignId } })).not.toBeNull()
    expect(await prisma.walletTransaction.findUnique({ where: { id: realTransactionId } })).not.toBeNull()
  }, 300_000)
})

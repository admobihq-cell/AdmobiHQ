import { describe, expect, it } from "vitest"

import { buildAdvertiserDashboard, type AdvertiserOrgRaw } from "./advertiser-dashboard"

const window = { start: "2026-10-01", end: "2026-10-31" }

const org = (over: Partial<AdvertiserOrgRaw> & { orgId: number }): AdvertiserOrgRaw => ({
  name: `Org ${over.orgId}`,
  contact: `contact${over.orgId}@example.com`,
  createdDay: "2026-01-01",
  campaignCount: 3,
  liveCampaigns: 1,
  rejectedCampaigns: 0,
  daysSinceLastCampaign: 5,
  lastCampaignName: "Spring",
  spendKes: 1000,
  previousSpendKes: 1000,
  balanceKes: 5000,
  funding: "healthy",
  ...over,
})

const orgs = [
  org({ orgId: 1, spendKes: 6000, previousSpendKes: 5000 }),
  org({ orgId: 2, spendKes: 3000, previousSpendKes: 3000, funding: "short", balanceKes: -400 }),
  org({ orgId: 3, spendKes: 500, previousSpendKes: 2000 }), // spend down 75%
  org({ orgId: 4, daysSinceLastCampaign: 90, spendKes: 0, previousSpendKes: 0 }), // dormant
  org({ orgId: 5, rejectedCampaigns: 3, spendKes: 0, previousSpendKes: null }),
  org({ orgId: 6, createdDay: "2026-10-12", campaignCount: 0, liveCampaigns: 0, daysSinceLastCampaign: 19, spendKes: 0, previousSpendKes: null }),
]

/** Every key anywhere in the value, so a leaked money field can't hide inside a nested row. */
function keysOf(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, found))
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      found.add(key)
      keysOf(v, found)
    }
  }
  return found
}

const MONEY_KEYS = [
  "liveSpenders", "avgSpendKes", "top5Share", "shortOfFunds", "spendDown",
  "topAdvertisers", "concentration", "balanceKes", "spendChange", "spendKes", "previousSpendKes", "funding",
]

describe("buildAdvertiserDashboard", () => {
  it("returns no money keys at all without includeMoney, even if the input carries money", () => {
    const dto = buildAdvertiserDashboard(orgs, { includeMoney: false, window })
    const keys = keysOf(dto)
    for (const key of MONEY_KEYS) expect(keys.has(key), key).toBe(false)
    expect(JSON.stringify(dto)).not.toMatch(/6000|3000|5000|-400/)
  })

  it("still reports counts and campaign activity without money", () => {
    const dto = buildAdvertiserDashboard(orgs, { includeMoney: false, window })
    expect(dto.kpis).toEqual({ activeOrgs: 4, newOrgs: 1, liveOrgs: 5 })
    expect(dto.counts).toEqual({ dormant: 1, rejectedRepeatedly: 1 })
    // Short of funds and spend down need money, so those orgs are not flagged at all.
    expect(dto.atRisk.map((r) => r.blocker).sort()).toEqual(["dormant", "rejected_repeatedly"])
  })

  it("adds spend, concentration and the money rules with includeMoney", () => {
    const dto = buildAdvertiserDashboard(orgs, { includeMoney: true, window })
    expect(dto.kpis).toMatchObject({ liveSpenders: 3, avgSpendKes: 3166.67 })
    expect(dto.kpis.top5Share).toBe(1) // only three orgs spent, so the top five hold all of it
    expect(dto.counts).toEqual({ dormant: 1, rejectedRepeatedly: 1, shortOfFunds: 1, spendDown: 1 })
    expect(dto.topAdvertisers?.map((a) => a.name)).toEqual(["Org 1", "Org 2", "Org 3"])
    expect(dto.topAdvertisers?.[0]?.change).toBe(20)
    expect(dto.concentration?.reduce((s, c) => s + c.value, 0)).toBe(9500)
  })

  it("orders the at-risk ledger by urgency, and says why", () => {
    const dto = buildAdvertiserDashboard(orgs, { includeMoney: true, window })
    expect(dto.atRisk.map((r) => [r.orgId, r.blocker])).toEqual([
      [2, "short_of_funds"],
      [5, "rejected_repeatedly"],
      [3, "spend_down"],
      [4, "dormant"],
    ])
    expect(dto.atRisk[0]).toMatchObject({ reason: "Short of funds", balanceKes: -400 })
    expect(dto.atRisk[2]?.spendChange).toBe(-75)
  })

  it("fills the new-orgs trend for every day, and survives an empty network", () => {
    const dto = buildAdvertiserDashboard(orgs, { includeMoney: false, window })
    expect(dto.newOrgsTrend).toHaveLength(31)
    expect(dto.newOrgsTrend.find((p) => p.day === "2026-10-12")?.orgs).toBe(1)

    const empty = buildAdvertiserDashboard([], { includeMoney: true, window })
    expect(empty.kpis).toMatchObject({ activeOrgs: 0, newOrgs: 0, liveSpenders: 0, avgSpendKes: null, top5Share: null })
    expect(empty.atRisk).toEqual([])
    expect(empty.concentration).toEqual([])
  })
})

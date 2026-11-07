import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { nairobiDay } from "@workspace/ops-contracts"

import { GET as audienceRoute } from "./audience/route"
import { GET as campaignRoute } from "./campaigns/[id]/route"
import { GET as campaignsRoute } from "./campaigns/route"
import { GET as deliveryRoute } from "./delivery/route"
import { GET as overviewRoute } from "./overview/route"
import { GET as spendRoute } from "./spend/route"
import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()

let actingOrgId = 0
let actingIsOwner = true
let actingPermissions = new Set<string>(["reports:read", "billing:read"])

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerPermissionAccess: vi.fn(async (permission: string) => {
      if (!actingIsOwner && !actingPermissions.has(permission)) {
        return {
          error: new Response(JSON.stringify({ error: `Forbidden — "${permission}" access required` }), {
            status: 403,
          }),
        }
      }
      return {
        access: { userId: "rep-test-user", orgId: actingOrgId, isOwner: actingIsOwner, permissions: actingPermissions },
      }
    }),
  }
})

const addDays = (day: string, n: number) =>
  new Date(Date.parse(day) + n * 86_400_000).toISOString().slice(0, 10)
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const call = (path: string, query = "") => new Request(`http://localhost/v1/customer/reports/${path}${query}`)

function expectFinite(value: unknown, path = "$"): void {
  if (typeof value === "number") expect(Number.isFinite(value), `${path} is ${value}`).toBe(true)
  else if (Array.isArray(value)) value.forEach((v, i) => expectFinite(v, `${path}[${i}]`))
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([k, v]) => expectFinite(v, `${path}.${k}`))
}

const RANGE = "?from=2026-03-01&to=2026-03-02"
const MEMBER = ["reports:read"]

describe.skipIf(!databaseUrl)("customer report routes", () => {
  // Each request makes a dozen round-trips to a remote database, and the first one also pays for cold imports.
  vi.setConfig({ testTimeout: 30_000 })
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `rep-test-${Date.now()}`
  const today = nairobiDay(new Date())

  const orgs: Record<"A" | "B" | "C" | "Z" | "N", number> = { A: 0, B: 0, C: 0, Z: 0, N: 0 }
  const cids: Record<string, number> = {}
  const cid = (key: string) => cids[key]!

  async function campaign(key: string, org: number, over: { format?: string; budget?: number } = {}) {
    cids[key] = (
      await prisma.campaign.create({
        data: {
          clerk_user_id: tag,
          org_id: org,
          name: `${tag} ${key}`,
          status: "approved",
          market: "CBD",
          format: over.format ?? "taxi_top",
          budget_kes: over.budget ?? 10000,
          starts_on: utc(addDays(today, -5)),
          ends_on: utc(addDays(today, 10)),
        },
      })
    ).id
  }

  type Stat = {
    campaign: string
    day: string
    market: string
    daypart: string
    format?: string
    sched: number
    delivered: number
    missed?: number
    over?: number
    vehicles?: number
    impressions?: [number, number, number] | null
    source: string
  }
  const stat = (s: Stat) => ({
    campaign_id: cid(s.campaign),
    day: utc(s.day),
    market: s.market,
    daypart: s.daypart,
    format: s.format ?? "taxi_top",
    plays_scheduled: s.sched,
    plays_delivered: s.delivered,
    plays_missed: s.missed ?? 0,
    plays_over: s.over ?? 0,
    active_vehicles: s.vehicles ?? 0,
    impressions_low: s.impressions?.[0] ?? null,
    impressions_likely: s.impressions?.[1] ?? null,
    impressions_high: s.impressions?.[2] ?? null,
    source: s.source,
  })

  beforeAll(async () => {
    for (const key of Object.keys(orgs) as (keyof typeof orgs)[]) {
      orgs[key] = (await prisma.advertiserOrg.create({ data: { name: `${tag} ${key}` } })).id
    }
    await campaign("A1", orgs.A)
    await campaign("A2", orgs.A, { format: "delivery_bike", budget: 4000 })
    await campaign("B1", orgs.B)
    await campaign("C1", orgs.C)
    await campaign("Z1", orgs.Z)

    const day = "2026-03-01"
    await prisma.campaignDailyStat.createMany({
      data: [
        stat({ campaign: "A1", day, market: "CBD", daypart: "morning", sched: 100, delivered: 90, missed: 10, vehicles: 3, impressions: [800, 1000, 1200], source: "modelled" }),
        stat({ campaign: "A1", day, market: "CBD", daypart: "evening", sched: 100, delivered: 110, over: 10, vehicles: 5, impressions: [2400, 3000, 3600], source: "modelled" }),
        stat({ campaign: "A1", day, market: "Westlands", daypart: "morning", sched: 50, delivered: 40, missed: 10, vehicles: 4, impressions: [300, 400, 500], source: "modelled" }),
        stat({ campaign: "A2", day, market: "CBD", daypart: "midday", format: "delivery_bike", sched: 40, delivered: 40, vehicles: 4, impressions: null, source: "logged" }),
        // Org B's numbers are far larger, so any leak into A is obvious.
        stat({ campaign: "B1", day, market: "CBD", daypart: "evening", sched: 9000, delivered: 9000, vehicles: 90, impressions: [900000, 999999, 1100000], source: "calibrated" }),
        // Org C only has logged plays: no impression estimate anywhere.
        stat({ campaign: "C1", day, market: "CBD", daypart: "morning", sched: 10, delivered: 10, vehicles: 1, impressions: null, source: "logged" }),
      ],
    })
    await prisma.campaignReachStat.createMany({
      data: [
        { campaign_id: cid("A1"), as_of: utc("2026-03-01"), reach_low: 700, reach_likely: 900, reach_high: 1100, source: "modelled" },
        { campaign_id: cid("A1"), as_of: utc("2026-03-02"), reach_low: 900, reach_likely: 1200, reach_high: 1500, source: "modelled" },
      ],
    })
    await prisma.campaignCreativeDailyStat.createMany({
      data: [
        { campaign_id: cid("A1"), creative_name: "Spring A", day: utc(day), plays_delivered: 60, impressions_likely: 2600 },
        { campaign_id: cid("A1"), creative_name: "Spring B", day: utc(day), plays_delivered: 40, impressions_likely: 1800 },
      ],
    })

    const at = (iso: string) => new Date(`${iso}T09:00:00.000Z`)
    const row = (org: number, key: string, amount: number, category: string) => ({
      org_id: org,
      campaign_id: cid(key),
      kind: "spend",
      amount_kes: amount,
      spend_category: category,
      provider: "manual",
      description: `${tag} spend`,
      occurred_at: at("2026-03-01"),
    })
    await prisma.walletTransaction.createMany({
      data: [row(orgs.A, "A1", -2000, "screen_time"), row(orgs.A, "A1", -500, "tax"), row(orgs.B, "B1", -777, "screen_time")],
    })
  }, 60_000)

  afterAll(async () => {
    // Stats cascade with their campaign; ledger rows go first because their org FK is SET NULL.
    await prisma.walletTransaction.deleteMany({ where: { description: { startsWith: tag } } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: Object.values(orgs) } } })
    await prisma.$disconnect()
  })

  const as = (org: number, owner = true, permissions: string[] = ["reports:read", "billing:read"]) => {
    actingOrgId = org
    actingIsOwner = owner
    actingPermissions = new Set(permissions)
  }
  const ROUTES = {
    overview: overviewRoute,
    delivery: deliveryRoute,
    audience: audienceRoute,
    spend: spendRoute,
    campaigns: campaignsRoute,
  }
  const get = (route: keyof typeof ROUTES, query = RANGE) => ROUTES[route](call(route, query))

  it("zero-row org returns zeros, nulls and measurementLevel booked", async () => {
    as(orgs.N)
    const res = await get("overview")
    expect(res.status).toBe(200)
    const body = await res.json()
    expectFinite(body)
    expect(body).toMatchObject({
      measurementLevel: "booked",
      hasDeliveryRows: false,
      impressions: null,
      deliveryRate: null,
      costPerThousandKes: null,
      reachLikely: null,
      ledger: { atRisk: 0, watch: 0, rows: [] },
    })
    expect(body.playsDelivered.current).toBe(0)
    for (const route of ["delivery", "audience", "spend"] as const) {
      const other = await get(route)
      expect(other.status, route).toBe(200)
      expectFinite(await other.json())
    }
  })

  it("booked content still returns with no stats rows", async () => {
    as(orgs.Z)
    const body = await (await get("overview")).json()
    expect(body.hasDeliveryRows).toBe(false)
    expect(body.measurementLevel).toBe("booked")
    expect(body.ledger.rows).toHaveLength(1)
    expect(body.ledger.rows[0]).toMatchObject({ playsScheduled: 0, deliveryRate: null })
    expect(body.ledger.rows[0].impressions).toEqual({ low: null, likely: null, high: null })
  })

  it("all-null impressions total null, not 0", async () => {
    as(orgs.C)
    const body = await (await get("overview")).json()
    expect(body.impressions).toBeNull()
    expect(body.measurementLevel).toBe("logged")
    expect(body.ledger.rows[0].impressions.likely).toBeNull()
    const delivery = await (await get("delivery")).json()
    expect(delivery.totals.delivered).toBe(10)
  })

  it("sums what exists and treats null as not estimated", async () => {
    as(orgs.A)
    const body = await (await get("overview")).json()
    // A2 has no estimate; A1's three modelled rows give 1000 + 3000 + 400.
    expect(body.impressions).toMatchObject({ current: 4400, low: 3500, high: 5300, change: null })
  })

  it("measurementLevel is the lowest source in view", async () => {
    as(orgs.A)
    expect((await (await get("overview")).json()).measurementLevel).toBe("logged")
    // Narrowed to the modelled campaign, the lowest level rises.
    const only = await (await get("overview", `${RANGE}&campaign=${cid("A1")}`)).json()
    expect(only.measurementLevel).toBe("modelled")
  })

  it("delivery rate ignores over-delivered plays", async () => {
    as(orgs.A)
    const body = await (await get("delivery")).json()
    expect(body.totals).toMatchObject({ scheduled: 290, delivered: 280, missed: 20, over: 10 })
    // (280 - 10) / 290, not 280 / 290.
    expect(body.deliveryRate).toBeCloseTo(270 / 290, 5)
    const overview = await (await get("overview")).json()
    expect(overview.pacing).toMatchObject({ delivered: 270, remaining: 20 })
  })

  it("active vehicles takes the daypart max per day, not the sum", async () => {
    as(orgs.A)
    const body = await (await get("delivery")).json()
    const point = body.activeVehiclesTrend.find((p: { day: string }) => p.day === "2026-03-01")
    // A1: morning 3 + 4 = 7, evening 5 -> 7. A2: 4. Summing everything would give 16.
    expect(point.vehicles).toBe(11)
    expect(body.activeVehiclesTrend.find((p: { day: string }) => p.day === "2026-03-02").vehicles).toBe(0)
  })

  it("creative rotation shares plays", async () => {
    as(orgs.A)
    const body = await (await get("delivery")).json()
    expect(body.creatives.map((c: { name: string; share: number }) => [c.name, c.share])).toEqual([
      ["Spring A", 0.6],
      ["Spring B", 0.4],
    ])
  })

  it("reach appears for one campaign and is null for several", async () => {
    as(orgs.A)
    expect((await (await get("overview")).json()).reachLikely).toBeNull()
    expect((await (await get("audience")).json()).reach).toBeNull()
    const one = await (await get("audience", `${RANGE}&campaign=${cid("A1")}`)).json()
    expect(one.reach).toMatchObject({ likely: 1200 })
    // Frequency is impressions over reach for that one campaign.
    expect(one.reach.frequency).toBeCloseTo(4400 / 1200, 5)
  })

  it("reach is the latest row, not a sum", async () => {
    as(orgs.A)
    const body = await (await get("overview", `${RANGE}&campaign=${cid("A1")}`)).json()
    expect(body.reachLikely).toBe(1200) // not 900 + 1200
    // An end date before the second row picks the first.
    const early = await (await get("overview", `?from=2026-03-01&to=2026-03-01&campaign=${cid("A1")}`)).json()
    expect(early.reachLikely).toBe(900)
  })

  it("cost per 1,000 excludes tax rows", async () => {
    as(orgs.A)
    const body = await (await get("overview")).json()
    // KES 2,000 of screen time over 4,400 impressions. Counting the 500 of tax would give ~568.
    expect(body.costPerThousandKes.current).toBeCloseTo((2000 * 1000) / 4400, 2)
    const spend = await (await get("spend")).json()
    expect(spend.costPerThousandKes).toBeCloseTo((2000 * 1000) / 4400, 2)
    expect(spend.spentKes.current).toBe(2500) // what was actually charged, tax included
  })

  it("a market filter sets spend and cost per 1,000 to null", async () => {
    as(orgs.A)
    const overview = await (await get("overview", `${RANGE}&market=CBD`)).json()
    expect(overview.costPerThousandKes).toBeNull()
    expect(overview.ledger.rows.every((r: { spentKes: unknown; costPerThousandKes: unknown }) => r.spentKes === null && r.costPerThousandKes === null)).toBe(true)
    // Budget is not spend, so it survives the filter.
    expect(overview.ledger.rows.some((r: { budgetKes: unknown }) => r.budgetKes !== null)).toBe(true)
    const spend = await (await get("spend", `${RANGE}&daypart=evening`)).json()
    expect(spend).toMatchObject({ spentKes: null, costPerThousandKes: null, byCampaign: null })
    // The delivery numbers do follow the filter.
    const cbd = await (await get("delivery", `${RANGE}&market=Westlands`)).json()
    expect(cbd.totals.scheduled).toBe(50)
  })

  it("without billing:read every money field is null, including campaign rows and csv", async () => {
    as(orgs.A, false, MEMBER)
    const overview = await (await get("overview")).json()
    expect(overview.costPerThousandKes).toBeNull()
    expect(overview.ledger.unspentBudgetKes).toBeNull()
    expect(overview.ledger.rows.length).toBe(2)
    for (const row of overview.ledger.rows) {
      expect(row).toMatchObject({ budgetKes: null, spentKes: null, costPerThousandKes: null })
    }
    const rows = (await (await get("campaigns")).json()).items
    for (const row of rows) expect(row).toMatchObject({ budgetKes: null, spentKes: null, costPerThousandKes: null })

    const csv = await (await get("campaigns", `${RANGE}&export=csv`)).text()
    expect(csv).not.toMatch(/10000|4000|2000|2500/)
    const [header, ...lines] = csv.trim().split("\n")
    const columns = header!.split(",")
    for (const line of lines) {
      expect(line.split(",")[columns.indexOf("budget_kes")]).toBe("")
      expect(line.split(",")[columns.indexOf("spent_kes")]).toBe("")
    }
    // The campaign report is gated the same way.
    const GET = campaignRoute
    const report = await (await GET(call(`campaigns/${cid("A1")}`, RANGE), { params: Promise.resolve({ id: String(cid("A1")) }) })).json()
    expect(report.budget).toEqual({ budgetKes: null, spentKes: null, remainingKes: null })
    expect(report.kpis.costPerThousandKes).toBeNull()
  })

  it("owners and billing readers see the money", async () => {
    as(orgs.A)
    const rows = (await (await get("campaigns")).json()).items
    const a1 = rows.find((r: { id: number }) => r.id === cid("A1"))
    expect(a1).toMatchObject({ budgetKes: 10000, spentKes: 2500 })
    expect((await (await get("overview")).json()).ledger.unspentBudgetKes).toBe(10000 - 2500 + 4000)
  })

  it("spend tab returns 403 without billing:read", async () => {
    as(orgs.A, false, MEMBER)
    expect((await get("spend")).status).toBe(403)
    as(orgs.A, false, ["reports:read", "billing:read"])
    expect((await get("spend")).status).toBe(200)
  })

  it("returns 403 without reports:read", async () => {
    as(orgs.A, false, ["billing:read"])
    for (const route of ["overview", "delivery", "audience", "campaigns"] as const) {
      expect((await get(route)).status, route).toBe(403)
    }
  })

  it("org A never sees org B's delivery; another org's campaign id returns 404", async () => {
    as(orgs.A)
    const delivery = await (await get("delivery")).json()
    expect(delivery.totals.scheduled).toBe(290) // B's 9,000 is nowhere in it
    const audience = await (await get("audience")).json()
    expect(JSON.stringify(audience)).not.toContain("999999")

    expect((await get("overview", `${RANGE}&campaign=${cid("B1")}`)).status).toBe(404)
    const GET = campaignRoute
    const res = await GET(call(`campaigns/${cid("B1")}`, RANGE), { params: Promise.resolve({ id: String(cid("B1")) }) })
    expect(res.status).toBe(404)
  })

  it("campaign report returns one campaign's numbers", async () => {
    as(orgs.A)
    const GET = campaignRoute
    const res = await GET(call(`campaigns/${cid("A1")}`, RANGE), { params: Promise.resolve({ id: String(cid("A1")) }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expectFinite(body)
    expect(body.campaign.id).toBe(cid("A1"))
    expect(body.kpis).toMatchObject({ playsDelivered: 240, reach: { likely: 1200 } })
    expect(body.budget).toEqual({ budgetKes: 10000, spentKes: 2500, remainingKes: 7500 })
    expect(body.marketByDaypart.length).toBeGreaterThan(0)
  })

  it("audience heatmaps and market ranking", async () => {
    as(orgs.A)
    const body = await (await get("audience")).json()
    expect(body.byMarket[0]).toMatchObject({ name: "CBD", value: 4000 })
    expect(body.marketByDaypart).toContainEqual({ x: "CBD", y: "Evening", value: 3000 })
    expect(body.weekdayByDaypart.some((c: { x: string }) => c.x === "Sun")).toBe(true) // 1 Mar 2026 is a Sunday
  })

  it("filters combine, and unknown filter values return 400", async () => {
    as(orgs.A)
    const both = await (await get("delivery", `${RANGE}&market=CBD&daypart=evening`)).json()
    expect(both.totals).toMatchObject({ scheduled: 100, delivered: 110, over: 10 })
    for (const query of ["&market=Atlantis", "&format=helicopter", "&daypart=dawn", "&campaign=abc", "&campaign=0"]) {
      expect((await get("overview", `${RANGE}${query}`)).status, query).toBe(400)
    }
    for (const query of ["?range=forever", "?from=2026-03-02&to=2026-03-01", "?from=2025-01-01&to=2026-03-01"]) {
      expect((await get("overview", query)).status, query).toBe(400)
    }
  })

  it("delivery csv returns the daily log", async () => {
    as(orgs.A)
    const res = await get("delivery", `${RANGE}&export=csv`)
    expect(res.headers.get("content-type")).toContain("text/csv")
    const lines = (await res.text()).trim().split("\n")
    expect(lines[0]).toBe("day,scheduled,delivered,missed,over")
    expect(lines).toHaveLength(3) // header + 1 and 2 March
    expect(lines[1]).toBe("2026-03-01,290,280,20,10")
  })

  it("the all range starts at the first day with data", async () => {
    as(orgs.A)
    const body = await (await get("delivery", "?range=all")).json()
    expect(body.trend[0].day).toBe("2026-03-01")
    expect(body.trend.length).toBeLessThan(400)
    expect(body.totals.scheduled).toBe(290)
  })
})

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { nairobiDay } from "@workspace/ops-contracts"

import { testDatabaseUrl } from "@/lib/test-database-url"

const databaseUrl = testDatabaseUrl()

let actingOrgId = 0
let actingIsOwner = true
let actingPermissions = new Set<string>(["billing:read"])

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
        access: { userId: "fin-test-user", orgId: actingOrgId, isOwner: actingIsOwner, permissions: actingPermissions },
      }
    }),
  }
})

const addDays = (day: string, n: number) =>
  new Date(Date.parse(day) + n * 86_400_000).toISOString().slice(0, 10)
const at = (iso: string) => new Date(`${iso}T09:00:00.000Z`)
const call = (path: string, query = "") => new Request(`http://localhost/v1/customer/finance/${path}${query}`)

/** Every number in a payload must be finite: NaN and Infinity serialise to null and hide bugs. */
function expectFinite(value: unknown, path = "$"): void {
  if (typeof value === "number") expect(Number.isFinite(value), `${path} is ${value}`).toBe(true)
  else if (Array.isArray(value)) value.forEach((v, i) => expectFinite(v, `${path}[${i}]`))
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([k, v]) => expectFinite(v, `${path}.${k}`))
}

const RANGE = "?from=2026-01-01&to=2026-02-28"

describe.skipIf(!databaseUrl)("customer finance routes", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const stamp = Date.now()
  const tag = `fin-test-${stamp}`
  const today = nairobiDay(new Date())

  let orgA = 0
  let orgB = 0
  let orgEmpty = 0
  let orgUntracked = 0
  let orgPaged = 0
  let invoiceA = 0
  let invoiceB = 0
  const campaigns: Record<string, number> = {}
  const cid = (key: string) => campaigns[key]!

  async function campaign(
    key: string,
    orgId: number,
    over: { status?: string; starts: string; ends: string; budget: number | null; name?: string }
  ) {
    const row = await prisma.campaign.create({
      data: {
        clerk_user_id: tag,
        org_id: orgId,
        name: over.name ?? `${tag} ${key}`,
        status: over.status ?? "approved",
        budget_kes: over.budget,
        starts_on: at(over.starts),
        ends_on: at(over.ends),
      },
    })
    campaigns[key] = row.id
  }

  const tx = (
    org: number,
    kind: string,
    amount: number,
    iso: string,
    extra: { campaign?: number; category?: string; n?: number } = {}
  ) => ({
    org_id: org,
    kind,
    amount_kes: amount,
    campaign_id: extra.campaign ?? null,
    spend_category: extra.category ?? null,
    provider: "manual",
    description: `${tag} ${kind} ${extra.n ?? ""}`.trim(),
    occurred_at: at(iso),
  })

  beforeAll(async () => {
    const mk = async (n: string) => (await prisma.advertiserOrg.create({ data: { name: `${tag} ${n}` } })).id
    ;[orgA, orgB, orgEmpty, orgUntracked, orgPaged] = (await Promise.all(
      ["A", "B", "empty", "untracked", "paged"].map(mk)
    )) as [number, number, number, number, number]

    await campaign("A1", orgA, { starts: addDays(today, -5), ends: addDays(today, 10), budget: 4000 })
    await campaign("A2", orgA, { starts: addDays(today, -3), ends: addDays(today, 20), budget: 1000 })
    await campaign("A3", orgA, { starts: addDays(today, -4), ends: addDays(today, 9), budget: 100 }) // overspent
    await campaign("A4", orgA, { starts: addDays(today, 5), ends: addDays(today, 30), budget: 700 }) // scheduled
    await campaign("A5", orgA, { status: "draft", starts: addDays(today, 1), ends: addDays(today, 9), budget: 5000 })
    await campaign("B1", orgB, { starts: addDays(today, -5), ends: addDays(today, 10), budget: 9000, name: `${tag} SECRET-B` })
    await campaign("U1", orgUntracked, { starts: addDays(today, -2), ends: addDays(today, 30), budget: 50000 })

    await prisma.walletTransaction.createMany({
      data: [
        tx(orgA, "top_up", 10000, "2026-01-05"),
        tx(orgA, "spend", -3000, "2026-01-20", { campaign: cid("A1"), category: "screen_time" }),
        tx(orgA, "spend", -1000, "2026-02-03", { campaign: cid("A1"), category: "production" }),
        tx(orgA, "refund", 200, "2026-02-10", { campaign: cid("A1"), category: "production" }),
        // Org A's row, but pointing at org B's campaign: counted for A, B's name never shown.
        tx(orgA, "spend", -500, "2026-02-15", { campaign: cid("B1"), category: "screen_time" }),
        tx(orgA, "spend", -300, "2026-02-20", { campaign: cid("A3"), category: "screen_time" }),
        tx(orgB, "top_up", 99999, "2026-01-06"),
        tx(orgB, "spend", -777, "2026-02-01", { campaign: cid("B1"), category: "screen_time" }),
        ...Array.from({ length: 30 }, (_, i) => ({
          ...tx(orgPaged, "top_up", 100, "2026-01-01", { n: i }),
          occurred_at: new Date(Date.UTC(2026, 0, 1, 0, i)),
        })),
      ],
    })

    const line = (description: string, amountKes: number) => ({ description, amountKes })
    const base = {
      period_start: at("2026-01-01"),
      period_end: at("2026-01-31"),
      issued_on: at("2026-02-01"),
      due_on: at("2026-02-15"),
      subtotal_kes: 1000,
      tax_kes: 160,
      total_kes: 1160,
    }
    invoiceA = (
      await prisma.invoice.create({
        data: { ...base, org_id: orgA, number: `${tag}-A`, lines: [line("Screen time → CBD", 1000)] },
      })
    ).id
    invoiceB = (
      await prisma.invoice.create({ data: { ...base, org_id: orgB, number: `${tag}-B`, lines: [line("Secret", 1000)] } })
    ).id
  }, 60_000)

  afterAll(async () => {
    const ids = [orgA, orgB, orgEmpty, orgUntracked, orgPaged]
    // Ledger and invoice rows go first: their org FK is SET NULL, which would orphan them.
    await prisma.walletTransaction.deleteMany({ where: { description: { startsWith: tag } } })
    await prisma.invoice.deleteMany({ where: { number: { startsWith: tag } } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
  })

  const as = (org: number, owner = true, permissions: string[] = ["billing:read"]) => {
    actingOrgId = org
    actingIsOwner = owner
    actingPermissions = new Set(permissions)
  }
  const summary = async (query = RANGE) => {
    const { GET } = await import("./summary/route")
    return GET(call("summary", query))
  }

  it("zero-row org returns zeros, not NaN, and funding untracked", async () => {
    as(orgEmpty)
    const res = await summary()
    expect(res.status).toBe(200)
    const body = await res.json()
    expectFinite(body)
    expect(body).toMatchObject({
      hasLedgerRows: false,
      balanceKes: 0,
      committedKes: 0,
      availableKes: null,
      funding: { level: "untracked", runwayDays: null },
      spendByCategory: [],
      spendByCampaign: [],
      moneyInOut: [],
      upcomingCharges: [],
    })
    expect(body.spentKes.change).toBeNull()
  })

  it("real budgets with no ledger rows stay untracked, with no short alert", async () => {
    as(orgUntracked)
    const body = await (await summary()).json()
    expect(body.committedKes).toBe(50000)
    expect(body.availableKes).toBeNull()
    expect(body.funding.level).toBe("untracked")
  })

  it("balance is all-time when the range is 7d; spent respects the range", async () => {
    as(orgA)
    const week = await (await summary("?range=7d")).json()
    expect(week.balanceKes).toBe(5400)
    expect(week.spentKes.current).toBe(0)
    const wide = await (await summary()).json()
    expect(wide.balanceKes).toBe(5400)
    expect(wide.spentKes.current).toBe(4600) // 3000 + 1000 + 500 + 300 - 200 refund
    expect(wide.topUpsKes.current).toBe(10000)
  })

  it("deltas compare to the previous period; 'all' has none", async () => {
    as(orgA)
    // 2026-02-01..2026-02-28 against 2026-01-04..2026-01-31.
    const body = await (await summary("?from=2026-02-01&to=2026-02-28")).json()
    expect(body.spentKes.current).toBe(1600)
    expect(body.spentKes.previous).toBe(3000)
    expect(body.spentKes.change).toBeCloseTo(-46.67, 1)
    const all = await (await summary("?range=all")).json()
    expect(all.spentKes.previous).toBeNull()
    expect(all.spentKes.change).toBeNull()
  })

  it("committed uses isActive and floors at 0 per campaign", async () => {
    as(orgA)
    const body = await (await summary()).json()
    // A1 4000-3800=200, A2 1000, A3 floors at 0 (spent 300 of 100), A4 scheduled 700, A5 draft excluded.
    expect(body.committedKes).toBe(1900)
    expect(body.availableKes).toBe(3500)
    expect(body.upcomingCharges).toEqual([
      expect.objectContaining({ campaignId: cid("A4"), remainingKes: 700 }),
    ])
    expect(body.funding.nextChargeKes).toBe(700)
  })

  it("org A never sees org B's money, invoices or statements", async () => {
    as(orgA)
    const body = await (await summary()).json()
    expect(JSON.stringify(body)).not.toContain("SECRET-B")
    expect(body.balanceKes).toBe(5400)

    const { GET: invoices } = await import("./invoices/route")
    const list = await (await invoices()).json()
    expect(list.items.map((i: { id: number }) => i.id)).toEqual([invoiceA])

    const { GET: statements } = await import("./statements/route")
    const rows = (await (await statements()).json()).items
    expect(rows[rows.length - 1].closing).toBe(5400)
  })

  it("a transaction on org A carrying org B's campaign is counted for A without exposing B's campaign name", async () => {
    as(orgA)
    const body = await (await summary()).json()
    expect(body.spendByCampaign).toContainEqual({ name: "Unassigned", value: 500 })

    const { GET } = await import("./transactions/route")
    const page = await (await GET(call("transactions", `${RANGE}&q=spend`))).json()
    const foreign = page.items.find((t: { amountKes: number }) => t.amountKes === -500)
    expect(foreign).toMatchObject({ campaignId: null, campaignName: null })
    expect(JSON.stringify(page)).not.toContain("SECRET-B")
  })

  it("an invoice id from another org returns 404", async () => {
    as(orgA)
    const { GET } = await import("./invoices/[id]/pdf/route")
    const res = await GET(call(`invoices/${invoiceB}/pdf`), { params: Promise.resolve({ id: String(invoiceB) }) })
    expect(res.status).toBe(404)
    const own = await GET(call(`invoices/${invoiceA}/pdf`), { params: Promise.resolve({ id: String(invoiceA) }) })
    expect(own.status).toBe(200)
    expect(own.headers.get("content-type")).toBe("application/pdf")
  }, 60_000)

  it("balance after is correct across pages", async () => {
    as(orgPaged)
    const { GET } = await import("./transactions/route")
    const one = await (await GET(call("transactions", "?range=all&sort=date_desc&page=1"))).json()
    const two = await (await GET(call("transactions", "?range=all&sort=date_desc&page=2"))).json()
    expect(one).toMatchObject({ total: 30, page: 1, totalPages: 2 })
    expect(one.items).toHaveLength(25)
    expect(one.items[0].balanceAfterKes).toBe(3000)
    expect(two.items).toHaveLength(5)
    expect(two.items[0].balanceAfterKes).toBe(500)
    expect(two.items[4].balanceAfterKes).toBe(100)
    expect(one.summary.topUpsKes).toBe(3000)
  })

  it("statements chain: closing = next opening; last closing = balance", async () => {
    as(orgA)
    const { GET } = await import("./statements/route")
    const rows = (await (await GET()).json()).items
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ month: "2026-01", opening: 0, topUpsKes: 10000, spendKes: 3000, closing: 7000 })
    expect(rows[1]).toMatchObject({ month: "2026-02", opening: 7000, spendKes: 1800, refundsKes: 200, closing: 5400 })

    const { GET: pdf } = await import("./statements/[month]/pdf/route")
    const ok = await pdf(call("statements/2026-01/pdf"), { params: Promise.resolve({ month: "2026-01" }) })
    expect(ok.status).toBe(200)
    const missing = await pdf(call("statements/2025-12/pdf"), { params: Promise.resolve({ month: "2025-12" }) })
    expect(missing.status).toBe(404)
    const bad = await pdf(call("statements/nope/pdf"), { params: Promise.resolve({ month: "nope" }) })
    expect(bad.status).toBe(400)
  }, 60_000)

  it("csv export returns every filtered row, not one page", async () => {
    as(orgPaged)
    const { GET } = await import("./transactions/route")
    const res = await GET(call("transactions", "?range=all&kind=top_up&format=csv"))
    expect(res.headers.get("content-type")).toContain("text/csv")
    const lines = (await res.text()).trim().split("\n")
    expect(lines).toHaveLength(31) // header + all 30, past the 25-row page size
    expect(lines[0]).toBe("date,type,description,reference,campaign,category,amount_kes,balance_after_kes")
  })

  it("returns 403 without billing:read", async () => {
    as(orgA, false, ["reports:read"])
    const routes = {
      summary: (await import("./summary/route")).GET,
      transactions: (await import("./transactions/route")).GET,
      invoices: (await import("./invoices/route")).GET,
      statements: (await import("./statements/route")).GET,
    }
    for (const [path, GET] of Object.entries(routes)) {
      expect((await GET(call(path))).status, path).toBe(403)
    }
  })

  it("rejects an unknown range, reversed dates and over 366 days with 400", async () => {
    as(orgA)
    for (const query of [
      "?range=forever",
      "?from=2026-02-10&to=2026-02-01",
      "?from=2025-01-01&to=2026-02-01",
      "?from=2026-02-01",
      "?from=nope&to=2026-02-01",
    ]) {
      expect((await summary(query)).status, query).toBe(400)
    }
    const { GET } = await import("./transactions/route")
    for (const query of ["?kind=gift", "?sort=random", "?page=0", "?page=x"]) {
      expect((await GET(call("transactions", query))).status, query).toBe(400)
    }
  })
})

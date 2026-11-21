import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { BillingDocumentInput } from "@workspace/ops-contracts"

import { changeBillingStatus, createBillingDocument } from "@/lib/billing/documents"
import { testDatabaseUrl } from "@/lib/test-database-url"
import { GET as pdf } from "./[id]/pdf/route"
import { GET as list } from "./route"

const databaseUrl = testDatabaseUrl()
const tag = `billing-cust-${Date.now()}`
let actingOrgId = 0

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerPermissionAccess: vi.fn(async () => ({
      access: { userId: "billing-cust-user", orgId: actingOrgId, isOwner: true, permissions: [] },
    })),
  }
})

const params = (id: number) => ({ params: Promise.resolve({ id: String(id) }) })

describe.skipIf(!databaseUrl)("customer billing documents", { timeout: 60_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  let orgId = 0
  let otherOrgId = 0
  let sentId = 0
  let draftId = 0
  let foreignId = 0

  const input = (org: number | null): BillingDocumentInput => ({
    kind: "invoice",
    orgId: org,
    campaignId: null,
    customer: { name: `${tag} customer`, contact: "", email: "", phone: "", address: "", taxPin: "", reference: "" },
    issueDate: "2026-11-21",
    dueDate: "2099-12-31",
    reference: tag,
    lines: [{ description: "Screen time", unit: "", quantity: 1, unitPriceKes: 1000, taxable: false }],
    discountPct: 0,
    taxPct: 0,
    feeLabel: "",
    feeKes: 0,
    note: "",
    paymentInstructions: "",
    terms: "",
  })

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} A` } })).id
    otherOrgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} B` } })).id
    actingOrgId = orgId
    sentId = (await createBillingDocument(input(orgId), tag)).id
    await changeBillingStatus(sentId, "send")
    draftId = (await createBillingDocument(input(orgId), tag)).id
    foreignId = (await createBillingDocument(input(otherOrgId), tag)).id
    await changeBillingStatus(foreignId, "send")
  }, 60_000)

  afterAll(async () => {
    await prisma.billingDocument.deleteMany({ where: { reference: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } })
    await prisma.$disconnect()
  })

  it("lists only the org's sent documents", async () => {
    const { items } = await (await list()).json()
    const ids = items.map((i: { id: number }) => i.id)
    expect(ids).toContain(sentId)
    expect(ids).not.toContain(draftId)
    expect(ids).not.toContain(foreignId)
    expect(items.find((i: { id: number }) => i.id === sentId)).toMatchObject({ paymentState: "unpaid", balanceKes: 1000 })
  })

  it("answers 404 for another org's document and for a draft", async () => {
    expect((await pdf(new Request("http://localhost/x"), params(foreignId))).status).toBe(404)
    expect((await pdf(new Request("http://localhost/x"), params(draftId))).status).toBe(404)
  })

  it("downloads its own sent invoice as a PDF", async () => {
    const res = await pdf(new Request("http://localhost/x"), params(sentId))
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment; filename=".*inv-2026-\d{4,}.*\.pdf"/i)
    const bytes = Buffer.from(await res.arrayBuffer())
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-")
  })
})

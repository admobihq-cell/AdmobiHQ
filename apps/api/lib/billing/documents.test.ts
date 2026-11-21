import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { BillingDocumentInput } from "@workspace/ops-contracts"

import { testDatabaseUrl } from "@/lib/test-database-url"
import {
  assertCampaignBelongsToOrg,
  createBillingDocument,
  listBillingDocuments,
  updateBillingDocument,
} from "./documents"

const databaseUrl = testDatabaseUrl()

describe.skipIf(!databaseUrl)("billing documents service", { timeout: 60_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `billing-svc-${Date.now()}`
  let orgId = 0
  let otherOrgId = 0
  let foreignCampaignId = 0

  const input = (overrides: Partial<BillingDocumentInput> = {}): BillingDocumentInput => ({
    kind: "invoice",
    orgId,
    campaignId: null,
    customer: { name: "", contact: "", email: "", phone: "", address: "", taxPin: "", reference: "" },
    issueDate: "2026-11-21",
    dueDate: "2026-12-05",
    reference: "",
    lines: [
      { description: "Discovery and content planning", unit: "hours", quantity: 4, unitPriceKes: 125, taxable: true },
      { description: "Responsive website design", unit: "project", quantity: 1, unitPriceKes: 2400, taxable: true },
    ],
    discountPct: 0,
    taxPct: 0,
    feeLabel: "",
    feeKes: 0,
    note: "",
    paymentInstructions: "",
    terms: "",
    ...overrides,
  })

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} A` } })).id
    otherOrgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} B` } })).id
    foreignCampaignId = (
      await prisma.campaign.create({ data: { clerk_user_id: tag, org_id: otherOrgId, name: `${tag} theirs` } })
    ).id
  })

  afterAll(async () => {
    await prisma.billingDocumentPayment.deleteMany({ where: { created_by: tag } })
    await prisma.billingDocument.deleteMany({ where: { created_by: tag } })
    await prisma.campaign.deleteMany({ where: { clerk_user_id: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } })
    await prisma.$disconnect()
  })

  it("assigns INV/<year>/0001-style numbers per kind and year", async () => {
    const invoice = await createBillingDocument(input(), tag)
    const quote = await createBillingDocument(input({ kind: "quote" }), tag)
    expect(invoice.number).toMatch(/^INV\/2026\/\d{4,}$/)
    expect(quote.number).toMatch(/^QT\/2026\/\d{4,}$/)
    expect(invoice.status).toBe("draft")
    // An empty customer name is filled from the org.
    expect(invoice.customer.name).toBe(`${tag} A`)
  })

  it("concurrent creates get distinct numbers", async () => {
    const docs = await Promise.all(Array.from({ length: 5 }, () => createBillingDocument(input(), tag)))
    expect(new Set(docs.map((d) => d.number)).size).toBe(5)
  })

  it("ignores client totals and stores computed totals", async () => {
    const doc = await createBillingDocument(
      { ...input({ discountPct: 5, taxPct: 16 }), totalKes: 1 } as BillingDocumentInput,
      tag
    )
    expect(doc.totalKes).toBe(3195.8)
    const row = await prisma.billingDocument.findUniqueOrThrow({ where: { id: doc.id } })
    expect(Number(row.total_kes)).toBe(3195.8)
  })

  it("update is refused once sent", async () => {
    const doc = await createBillingDocument(input(), tag)
    await prisma.billingDocument.update({ where: { id: doc.id }, data: { status: "sent" } })
    expect(await updateBillingDocument(doc.id, input({ reference: "changed" }))).toBe("locked")
    expect(await updateBillingDocument(999_999_999, input())).toBe("not_found")
  })

  it("update recomputes totals on a draft", async () => {
    const doc = await createBillingDocument(input(), tag)
    const updated = await updateBillingDocument(doc.id, input({ feeKes: 100, reference: "PO-9" }))
    expect(updated).toMatchObject({ totalKes: 3000, reference: "PO-9", number: doc.number })
  })

  it("assertCampaignBelongsToOrg rejects another org's campaign", async () => {
    expect(await assertCampaignBelongsToOrg(orgId, foreignCampaignId)).toMatch(/doesn't belong/)
    expect(await assertCampaignBelongsToOrg(null, foreignCampaignId)).toMatch(/customer/)
    expect(await assertCampaignBelongsToOrg(otherOrgId, foreignCampaignId)).toBeNull()
    expect(await assertCampaignBelongsToOrg(orgId, null)).toBeNull()
  })

  it("list returns paymentState derived from payments", async () => {
    const doc = await createBillingDocument(
      input({ lines: [{ description: "Screen time", unit: "", quantity: 1, unitPriceKes: 1000, taxable: false }] }),
      tag
    )
    await prisma.billingDocument.update({ where: { id: doc.id }, data: { status: "sent" } })
    await prisma.billingDocumentPayment.create({
      data: { document_id: doc.id, amount_kes: 400, method: "bank", paid_on: new Date("2026-11-21"), created_by: tag },
    })
    const items = await listBillingDocuments({ orgId }, "2026-11-21")
    const row = items.find((i) => i.id === doc.id)!
    expect(row).toMatchObject({ paidKes: 400, paymentState: "part_paid", customerName: `${tag} A`, orgName: `${tag} A` })
  })
})

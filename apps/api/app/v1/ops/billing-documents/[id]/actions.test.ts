import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { BillingDocumentInput } from "@workspace/ops-contracts"

import { createBillingDocument } from "@/lib/billing/documents"
import { testDatabaseUrl } from "@/lib/test-database-url"
import { POST as preview } from "../preview/route"
import { POST as convert } from "./convert/route"
import { POST as recordPayment } from "./payments/route"
import { POST as changeStatus } from "./status/route"

const databaseUrl = testDatabaseUrl()
const tag = `billing-act-${Date.now()}`

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async () => ({ access: { userId: "billing-act-user", email: "ops@admobihq.com" } })),
  }
})
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))

const params = (id: number) => ({ params: Promise.resolve({ id: String(id) }) })
const post = (body: unknown) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) })

describe.skipIf(!databaseUrl)("billing document actions", { timeout: 60_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  let orgId = 0

  const input = (overrides: Partial<BillingDocumentInput> = {}): BillingDocumentInput => ({
    kind: "invoice",
    orgId,
    campaignId: null,
    customer: { name: "", contact: "", email: "", phone: "", address: "", taxPin: "", reference: "" },
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
    ...overrides,
  })
  const status = async (id: number, action: string) => changeStatus(post({ action }), params(id))
  const pay = async (id: number, amountKes: number) =>
    recordPayment(post({ amountKes, method: "bank", paidOn: "2026-11-21", reference: "BANK-1" }), params(id))

  beforeAll(async () => {
    orgId = (await prisma.advertiserOrg.create({ data: { name: `${tag} A`, billing_email: "finance@a.test", tax_pin: "P0001" } })).id
  })

  afterAll(async () => {
    const docs = await prisma.billingDocument.findMany({ where: { reference: tag }, select: { id: true } })
    await prisma.billingDocumentPayment.deleteMany({ where: { document_id: { in: docs.map((d) => d.id) } } })
    await prisma.billingDocument.deleteMany({ where: { reference: tag } })
    await prisma.advertiserOrg.deleteMany({ where: { id: orgId } })
    await prisma.$disconnect()
  })

  it("sends a draft once, refreshing the customer from the org", async () => {
    const doc = await createBillingDocument(input(), tag)
    const res = await status(doc.id, "send")
    expect(res.status).toBe(200)
    const sent = await res.json()
    expect(sent.status).toBe("sent")
    expect(sent.sentAt).not.toBeNull()
    expect(sent.customer).toMatchObject({ email: "finance@a.test", taxPin: "P0001" })
    expect((await status(doc.id, "send")).status).toBe(409)
  })

  it("only accepts quotes; a mistaken draft can be voided without ever being shown", async () => {
    const invoice = await createBillingDocument(input(), tag)
    await status(invoice.id, "send")
    expect((await status(invoice.id, "accept")).status).toBe(409)
    const draft = await createBillingDocument(input(), tag)
    const voided = await status(draft.id, "void")
    expect(voided.status).toBe(200)
    expect(await voided.json()).toMatchObject({ status: "void", sentAt: null })
    expect((await status(draft.id, "void")).status).toBe(409)
  })

  it("converts a sent quote to a new draft invoice once", async () => {
    const quote = await createBillingDocument(input({ kind: "quote" }), tag)
    await status(quote.id, "send")
    const res = await convert(post({}), params(quote.id))
    expect(res.status).toBe(201)
    const invoice = await res.json()
    expect(invoice).toMatchObject({ kind: "invoice", status: "draft", sourceQuoteId: quote.id, totalKes: 1000 })
    expect(invoice.number).toMatch(/^INV\//)
    expect((await convert(post({}), params(quote.id))).status).toBe(409)
  })

  it("refuses payments on quotes and drafts", async () => {
    const quote = await createBillingDocument(input({ kind: "quote" }), tag)
    await status(quote.id, "send")
    expect((await pay(quote.id, 100)).status).toBe(409)
    const draft = await createBillingDocument(input(), tag)
    expect((await pay(draft.id, 100)).status).toBe(409)
  })

  it("records part and full payments, refuses overpayment and void, and never touches the wallet", async () => {
    const walletBefore = await prisma.walletTransaction.count({ where: { org_id: orgId } })
    const doc = await createBillingDocument(input(), tag)
    await status(doc.id, "send")

    const part = await (await pay(doc.id, 400)).json()
    expect(part).toMatchObject({ paymentState: "part_paid", paidKes: 400, balanceKes: 600 })

    const over = await pay(doc.id, 700)
    expect(over.status).toBe(409)
    expect((await over.json()).error).toMatch(/more than the balance/)

    const full = await (await pay(doc.id, 600)).json()
    expect(full).toMatchObject({ paymentState: "paid", balanceKes: 0 })

    const voidable = await createBillingDocument(input(), tag)
    await status(voidable.id, "send")
    expect((await status(voidable.id, "void")).status).toBe(200)
    expect((await pay(voidable.id, 100)).status).toBe(409)

    expect(await prisma.walletTransaction.count({ where: { org_id: orgId } })).toBe(walletBefore)
  })

  it("previews a sent document without error even when the body is edited", async () => {
    const doc = await createBillingDocument(input(), tag)
    await status(doc.id, "send")
    const forged = { ...input(), customer: { ...input().customer, name: "Someone" }, lines: [{ description: "Made up", unit: "", quantity: 1, unitPriceKes: 1, taxable: false }] }
    const res = await preview(post({ id: doc.id, document: forged }))
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Disposition")).toMatch(/^inline;/)
  })

  it("lets only one of two concurrent payments for the full balance through", async () => {
    const doc = await createBillingDocument(input(), tag)
    await status(doc.id, "send")
    const results = await Promise.all([pay(doc.id, 1000), pay(doc.id, 1000)])
    expect(results.map((r) => r.status).sort()).toEqual([201, 409])
  })
})

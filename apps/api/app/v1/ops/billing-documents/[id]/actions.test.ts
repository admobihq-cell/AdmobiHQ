import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import type { BillingDocumentInput } from "@workspace/ops-contracts"

import { createBillingDocument } from "@/lib/billing/documents"
import { sendEmail } from "@/lib/email/send-email"
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
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

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
    const billing = await prisma.advertiserRole.create({ data: { org_id: orgId, name: "Billing", permissions: ["billing:read"] } })
    const campaigns = await prisma.advertiserRole.create({ data: { org_id: orgId, name: "Campaigns", permissions: ["campaigns:read"] } })
    await prisma.advertiserMember.create({ data: { org_id: orgId, clerk_user_id: `${tag}-billing`, role_id: billing.id } })
    await prisma.advertiserMember.create({ data: { org_id: orgId, clerk_user_id: `${tag}-campaigns`, role_id: campaigns.id } })
  })

  afterAll(async () => {
    const docs = await prisma.billingDocument.findMany({ where: { reference: tag }, select: { id: true } })
    await prisma.billingDocumentPayment.deleteMany({ where: { document_id: { in: docs.map((d) => d.id) } } })
    await prisma.billingDocument.deleteMany({ where: { reference: tag } })
    await prisma.customerNotification.deleteMany({ where: { clerk_user_id: { startsWith: tag } } })
    await prisma.advertiserMember.deleteMany({ where: { org_id: orgId } })
    await prisma.advertiserRole.deleteMany({ where: { org_id: orgId } })
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

  it("sending a document notifies the org's billing readers", async () => {
    const doc = await createBillingDocument(input(), tag)
    expect((await status(doc.id, "send")).status).toBe(200)
    const rows = await prisma.customerNotification.findMany({
      where: { clerk_user_id: { startsWith: tag }, type: "billing_document_sent", title: { contains: doc.number } },
    })
    expect(rows.map((r) => r.clerk_user_id)).toEqual([`${tag}-billing`])
  })

  it("emails the PDF to the customer when a document is sent", async () => {
    vi.mocked(sendEmail).mockClear()
    const doc = await createBillingDocument(input(), tag)
    const sent = await (await status(doc.id, "send")).json()
    expect(sent.emailedTo).toBe("finance@a.test")
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [to, subject, html, options] = vi.mocked(sendEmail).mock.calls[0]!
    expect(to).toBe("finance@a.test")
    expect(subject).toContain(sent.number)
    expect(html).toContain(sent.number)
    expect(options?.attachments?.[0]?.filename).toMatch(/\.pdf$/)
    expect(Buffer.from(options!.attachments![0]!.content, "base64").subarray(0, 5).toString()).toBe("%PDF-")
  })

  it("still sends when the email fails or there is no address, and says so", async () => {
    vi.mocked(sendEmail).mockClear()
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("Resend down"))
    const failing = await createBillingDocument(input(), tag)
    const res = await status(failing.id, "send")
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: "sent", emailedTo: null, emailError: expect.stringMatching(/couldn't/i) })

    const prospect = await createBillingDocument(
      input({ orgId: null, customer: { name: "Walk-in", contact: "", email: "", phone: "", address: "", taxPin: "", reference: "" } }),
      tag
    )
    const noAddress = await (await status(prospect.id, "send")).json()
    expect(noAddress).toMatchObject({ status: "sent", emailedTo: null, emailError: expect.stringMatching(/no email/i) })
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

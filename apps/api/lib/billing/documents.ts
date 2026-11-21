import type { Prisma } from "@prisma/client"

import {
  billingCustomerSchema,
  billingPaymentState,
  computeBillingTotals,
  formatBillingNumber,
  formatKes,
  nairobiDay,
  type BillingStatusAction,
  type RecordBillingPaymentInput,
  type BillingCustomer,
  type BillingDocumentDto,
  type BillingDocumentInput,
  type BillingDocumentKind,
  type BillingDocumentListItemDto,
  type BillingDocumentStatus,
  type BillingLine,
  type BillingPaymentMethod,
} from "@workspace/ops-contracts"

import { ADMOBI_COMPANY } from "@/lib/billing/company"
import { prisma } from "@/lib/prisma"

/**
 * Hand-written quotes and invoices, billed outside the Paystack wallet.
 *
 * Money is always recomputed here with computeBillingTotals — totals a client
 * sends are ignored. Numbers come from a per-kind, per-year counter bumped in
 * the same transaction as the insert, so they are gapless and never collide.
 */

const DOCUMENT_INCLUDE = {
  org: { select: { name: true } },
  campaign: { select: { name: true } },
  payments: { orderBy: { paid_on: "asc" } },
} satisfies Prisma.BillingDocumentInclude

type DocumentRow = Prisma.BillingDocumentGetPayload<{ include: typeof DOCUMENT_INCLUDE }>

/** Prisma's defaults (2s to get a connection, 5s to finish) are too tight for
 * a cold Neon compute behind a 3-connection pool; concurrent saves queue on
 * the counter row and must wait their turn rather than fail. */
export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const

const day = (value: Date) => value.toISOString().slice(0, 10)
const toDate = (isoDay: string) => new Date(`${isoDay}T00:00:00.000Z`)
const num = (value: Prisma.Decimal | number) => Number(value)
const round2 = (value: number) => Math.round(value * 100) / 100

/** Next QT/… or INV/… number. Must run inside the transaction that inserts the document. */
export async function nextBillingNumber(
  tx: Prisma.TransactionClient,
  kind: BillingDocumentKind,
  issueDate: string
): Promise<string> {
  const year = Number(issueDate.slice(0, 4))
  const [row] = await tx.$queryRaw<{ last: number }[]>`
    INSERT INTO billing_document_counters (kind, year, last) VALUES (${kind}, ${year}, 1)
    ON CONFLICT (kind, year) DO UPDATE SET last = billing_document_counters.last + 1
    RETURNING last`
  return formatBillingNumber(kind, year, row!.last)
}

/** The columns written from an input, money included. */
function toColumns(input: BillingDocumentInput, customer: BillingCustomer) {
  const totals = computeBillingTotals(input)
  return {
    org_id: input.orgId,
    campaign_id: input.campaignId,
    customer: customer as Prisma.InputJsonValue,
    issue_date: toDate(input.issueDate),
    due_date: toDate(input.dueDate),
    reference: input.reference || null,
    lines: input.lines as Prisma.InputJsonValue,
    discount_pct: input.discountPct,
    tax_pct: input.taxPct,
    fee_label: input.feeLabel || null,
    fee_kes: totals.feeKes,
    subtotal_kes: totals.subtotalKes,
    discount_kes: totals.discountKes,
    tax_kes: totals.taxKes,
    total_kes: totals.totalKes,
    note: input.note || null,
    payment_instructions: input.paymentInstructions || null,
    terms: input.terms || null,
  }
}

/** An empty customer name falls back to the org's name. */
async function resolveCustomer(input: BillingDocumentInput): Promise<BillingCustomer> {
  if (input.customer.name.trim() || !input.orgId) return input.customer
  const org = await prisma.advertiserOrg.findUnique({ where: { id: input.orgId }, select: { name: true } })
  return { ...input.customer, name: org?.name ?? input.customer.name }
}

export function toBillingDocumentDto(
  row: DocumentRow,
  convertedInvoiceId: number | null,
  today: string = nairobiDay(new Date())
): BillingDocumentDto {
  const input: BillingDocumentInput = {
    kind: row.kind as BillingDocumentKind,
    orgId: row.org_id,
    campaignId: row.campaign_id,
    customer: billingCustomerSchema.parse(row.customer),
    issueDate: day(row.issue_date),
    dueDate: day(row.due_date),
    reference: row.reference ?? "",
    lines: row.lines as BillingLine[],
    discountPct: num(row.discount_pct),
    taxPct: num(row.tax_pct),
    feeLabel: row.fee_label ?? "",
    feeKes: num(row.fee_kes),
    note: row.note ?? "",
    paymentInstructions: row.payment_instructions ?? "",
    terms: row.terms ?? "",
  }
  const totals = computeBillingTotals(input)
  const totalKes = num(row.total_kes)
  const paidKes = round2(row.payments.reduce((sum, p) => sum + num(p.amount_kes), 0))
  const status = row.status as BillingDocumentStatus
  return {
    ...input,
    ...totals,
    // Stored totals are the record; they equal the recomputed ones by construction.
    subtotalKes: num(row.subtotal_kes),
    discountKes: num(row.discount_kes),
    taxKes: num(row.tax_kes),
    totalKes,
    id: row.id,
    number: row.number,
    status,
    orgName: row.org?.name ?? null,
    campaignName: row.campaign?.name ?? null,
    paidKes,
    balanceKes: round2(Math.max(totalKes - paidKes, 0)),
    paymentState: billingPaymentState({ kind: input.kind, status, totalKes, paidKes, dueDate: input.dueDate }, today),
    sentAt: row.sent_at?.toISOString() ?? null,
    voidedAt: row.voided_at?.toISOString() ?? null,
    sourceQuoteId: row.source_quote_id,
    convertedInvoiceId,
    payments: row.payments.map((p) => ({
      id: p.id,
      amountKes: num(p.amount_kes),
      method: p.method as BillingPaymentMethod,
      reference: p.reference ?? "",
      paidOn: day(p.paid_on),
      note: p.note ?? "",
      createdAt: p.created_at.toISOString(),
    })),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function getBillingDocument(id: number, today?: string): Promise<BillingDocumentDto | null> {
  const row = await prisma.billingDocument.findUnique({ where: { id }, include: DOCUMENT_INCLUDE })
  if (!row) return null
  const converted = await prisma.billingDocument.findUnique({ where: { source_quote_id: id }, select: { id: true } })
  return toBillingDocumentDto(row, converted?.id ?? null, today)
}

/** Error message when `campaignId` can't go on a document for `orgId`, else null. */
export async function assertCampaignBelongsToOrg(orgId: number | null, campaignId: number | null): Promise<string | null> {
  if (!campaignId) return null
  if (!orgId) return "Pick a customer organization before linking a campaign"
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, org_id: orgId }, select: { id: true } })
  // A campaign from another org would put this document on the wrong account's books.
  return campaign ? null : "That campaign doesn't belong to this organization"
}

export async function createBillingDocument(input: BillingDocumentInput, createdBy: string): Promise<BillingDocumentDto> {
  const customer = await resolveCustomer(input)
  const id = await prisma.$transaction(async (tx) => {
    const number = await nextBillingNumber(tx, input.kind, input.issueDate)
    const row = await tx.billingDocument.create({
      data: { ...toColumns(input, customer), kind: input.kind, number, created_by: createdBy },
      select: { id: true },
    })
    return row.id
  }, TX_OPTIONS)
  return (await getBillingDocument(id))!
}

/** Drafts only: anything sent is locked and must be voided and re-issued. */
export async function updateBillingDocument(
  id: number,
  input: BillingDocumentInput
): Promise<BillingDocumentDto | "not_found" | "locked"> {
  const existing = await prisma.billingDocument.findUnique({ where: { id }, select: { status: true, kind: true } })
  if (!existing) return "not_found"
  if (existing.status !== "draft") return "locked"
  const customer = await resolveCustomer(input)
  // The kind is fixed once numbered — a QT/ number must stay a quote.
  const updated = await prisma.billingDocument.updateMany({
    where: { id, status: "draft" },
    data: toColumns({ ...input, kind: existing.kind as BillingDocumentKind }, customer),
  })
  if (updated.count === 0) return "locked"
  return (await getBillingDocument(id))!
}

type ActionResult = BillingDocumentDto | "not_found" | { conflict: string }

/** Which statuses each action may start from. */
const TRANSITIONS: Record<BillingStatusAction, { from: BillingDocumentStatus[]; to: BillingDocumentStatus; kinds?: BillingDocumentKind[] }> = {
  send: { from: ["draft"], to: "sent" },
  accept: { from: ["sent"], to: "accepted", kinds: ["quote"] },
  decline: { from: ["sent"], to: "declined", kinds: ["quote"] },
  void: { from: ["sent", "accepted", "declined"], to: "void" },
}

const CONFLICT: Record<BillingStatusAction, string> = {
  send: "Only drafts can be sent",
  accept: "Only a sent quote can be accepted",
  decline: "Only a sent quote can be declined",
  void: "Drafts can't be voided — and void documents stay void",
}

export async function changeBillingStatus(id: number, action: BillingStatusAction): Promise<ActionResult> {
  const doc = await prisma.billingDocument.findUnique({
    where: { id },
    select: { kind: true, status: true, org_id: true, customer: true },
  })
  if (!doc) return "not_found"
  const rule = TRANSITIONS[action]
  if (!rule.from.includes(doc.status as BillingDocumentStatus) || (rule.kinds && !rule.kinds.includes(doc.kind as BillingDocumentKind))) {
    return { conflict: CONFLICT[action] }
  }

  const data: Prisma.BillingDocumentUpdateManyMutationInput = { status: rule.to }
  if (action === "send") {
    data.sent_at = new Date()
    // Freeze the customer as the org stands today: finance email and KRA PIN.
    if (doc.org_id) {
      const org = await prisma.advertiserOrg.findUnique({
        where: { id: doc.org_id },
        select: { name: true, billing_email: true, tax_pin: true },
      })
      const current = billingCustomerSchema.parse(doc.customer)
      if (org) {
        data.customer = {
          ...current,
          name: current.name || org.name,
          email: org.billing_email ?? current.email,
          taxPin: org.tax_pin ?? current.taxPin,
        } as Prisma.InputJsonValue
      }
    }
  }
  if (action === "void") data.voided_at = new Date()

  // The status guard in `where` makes two racing clicks safe: only one updates.
  const updated = await prisma.billingDocument.updateMany({ where: { id, status: doc.status }, data })
  if (updated.count === 0) return { conflict: CONFLICT[action] }
  return (await getBillingDocument(id))!
}

const addDays = (isoDay: string, days: number) =>
  new Date(toDate(isoDay).getTime() + days * 86_400_000).toISOString().slice(0, 10)

/** A sent or accepted quote becomes a new draft invoice with its own INV/ number. */
export async function convertQuoteToInvoice(id: number, createdBy: string): Promise<ActionResult> {
  const quote = await getBillingDocument(id)
  if (!quote) return "not_found"
  if (quote.kind !== "quote" || !["sent", "accepted"].includes(quote.status)) {
    return { conflict: "Only a sent or accepted quote can be converted" }
  }
  if (quote.convertedInvoiceId) return { conflict: "This quote has already been converted" }

  const today = nairobiDay(new Date())
  const input: BillingDocumentInput = {
    ...quote,
    kind: "invoice",
    issueDate: today,
    dueDate: addDays(today, 14),
    terms: ADMOBI_COMPANY.defaults.invoiceTerms,
  }
  try {
    const newId = await prisma.$transaction(async (tx) => {
      const number = await nextBillingNumber(tx, "invoice", input.issueDate)
      const row = await tx.billingDocument.create({
        data: { ...toColumns(input, quote.customer), kind: "invoice", number, source_quote_id: id, created_by: createdBy },
        select: { id: true },
      })
      return row.id
    }, TX_OPTIONS)
    return (await getBillingDocument(newId))!
  } catch (error: unknown) {
    // Two racing converts: the unique source_quote_id lets only one through.
    if ((error as { code?: string }).code === "P2002") return { conflict: "This quote has already been converted" }
    throw error
  }
}

/**
 * Money received against an invoice. Never touches the wallet. The document
 * row is locked for the check-and-insert, so two payments for the full
 * balance can't both pass the overpayment guard.
 */
export async function recordBillingPayment(
  id: number,
  input: RecordBillingPaymentInput,
  createdBy: string
): Promise<ActionResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    const [doc] = await tx.$queryRaw<{ kind: string; status: string; total_kes: Prisma.Decimal }[]>`
      SELECT kind, status, total_kes FROM billing_documents WHERE id = ${id} FOR UPDATE`
    if (!doc) return "not_found" as const
    if (doc.kind !== "invoice") return { conflict: "Payments can only be recorded against invoices" }
    if (doc.status === "draft") return { conflict: "Send the invoice before recording a payment" }
    if (doc.status === "void") return { conflict: "This invoice is void" }

    const paid = await tx.billingDocumentPayment.aggregate({ where: { document_id: id }, _sum: { amount_kes: true } })
    const paidKes = num(paid._sum.amount_kes ?? 0)
    const balanceKes = round2(num(doc.total_kes) - paidKes)
    const amountKes = round2(input.amountKes)
    if (amountKes > balanceKes + 0.001) {
      return { conflict: `That's more than the balance of ${formatKes(Math.max(balanceKes, 0))}` }
    }

    await tx.billingDocumentPayment.create({
      data: {
        document_id: id,
        amount_kes: amountKes,
        method: input.method,
        reference: input.reference || null,
        paid_on: toDate(input.paidOn),
        note: input.note || null,
        created_by: createdBy,
      },
    })
    return "ok" as const
  }, TX_OPTIONS)

  if (outcome !== "ok") return outcome
  return (await getBillingDocument(id))!
}

export async function listBillingDocuments(
  filter: { kind?: BillingDocumentKind; status?: BillingDocumentStatus; orgId?: number },
  today: string = nairobiDay(new Date())
): Promise<BillingDocumentListItemDto[]> {
  const rows = await prisma.billingDocument.findMany({
    where: { kind: filter.kind, status: filter.status, org_id: filter.orgId },
    include: DOCUMENT_INCLUDE,
    orderBy: [{ issue_date: "desc" }, { id: "desc" }],
    take: 500,
  })
  return rows.map((row) => {
    const doc = toBillingDocumentDto(row, null, today)
    return {
      id: doc.id,
      kind: doc.kind,
      number: doc.number,
      status: doc.status,
      orgName: doc.orgName,
      campaignName: doc.campaignName,
      issueDate: doc.issueDate,
      dueDate: doc.dueDate,
      totalKes: doc.totalKes,
      paidKes: doc.paidKes,
      paymentState: doc.paymentState,
      customerName: doc.customer.name,
    }
  })
}

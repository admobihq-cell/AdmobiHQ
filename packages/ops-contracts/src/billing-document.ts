import { z } from "zod"

/* ---- Hand-written quotes and invoices (billed outside the Paystack wallet) ---- */

export const BILLING_DOCUMENT_KINDS = ["quote", "invoice"] as const
export type BillingDocumentKind = (typeof BILLING_DOCUMENT_KINDS)[number]

export const BILLING_DOCUMENT_STATUSES = ["draft", "sent", "accepted", "declined", "void"] as const
export type BillingDocumentStatus = (typeof BILLING_DOCUMENT_STATUSES)[number]

/** Derived from recorded payments, never stored. Invoices only. */
export const BILLING_PAYMENT_STATES = ["unpaid", "part_paid", "paid", "overdue"] as const
export type BillingPaymentState = (typeof BILLING_PAYMENT_STATES)[number]

export const BILLING_PAYMENT_METHODS = ["bank", "mpesa", "cheque", "cash", "other"] as const
export type BillingPaymentMethod = (typeof BILLING_PAYMENT_METHODS)[number]

export const BILLING_PAYMENT_METHOD_LABELS: Record<BillingPaymentMethod, string> = {
  bank: "Bank transfer",
  mpesa: "M-Pesa",
  cheque: "Cheque",
  cash: "Cash",
  other: "Other",
}

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
const text = (max: number) => z.string().trim().max(max).default("")
/** At most 2 decimals: the columns are DECIMAL(_,2), and a finer value would be stored
 * rounded while totals were computed from the raw one — PDF and record would disagree. */
const twoDecimals = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6
const pct = z.number().min(0).max(100).refine(twoDecimals, "Use at most 2 decimals")

export const billingLineSchema = z.object({
  description: z.string().trim().min(1, "Describe the item").max(300),
  unit: text(30),
  quantity: z.number().gt(0, "Quantity must be more than 0").max(1_000_000),
  unitPriceKes: z.number().min(0).max(1_000_000_000),
  taxable: z.boolean().default(true),
})
export type BillingLine = z.infer<typeof billingLineSchema>

export const billingCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(200),
  contact: text(200),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).default(""),
  phone: text(40),
  address: text(500),
  taxPin: text(20),
  reference: text(100),
})
export type BillingCustomer = z.infer<typeof billingCustomerSchema>

export const billingDocumentInputSchema = z
  .object({
    kind: z.enum(BILLING_DOCUMENT_KINDS),
    orgId: z.number().int().positive().nullable(),
    campaignId: z.number().int().positive().nullable(),
    customer: billingCustomerSchema,
    issueDate: isoDay,
    dueDate: isoDay,
    reference: text(100),
    lines: z.array(billingLineSchema).min(1, "Add at least one line item").max(100),
    discountPct: pct.default(0),
    taxPct: pct.default(0),
    feeLabel: text(60),
    feeKes: z.number().min(0).max(1_000_000_000).default(0),
    note: text(2000),
    paymentInstructions: text(2000),
    terms: text(2000),
  })
  .refine((doc) => doc.dueDate >= doc.issueDate, {
    path: ["dueDate"],
    message: "Must be on or after the issue date",
  })
export type BillingDocumentInput = z.infer<typeof billingDocumentInputSchema>

export const billingStatusActionSchema = z.object({ action: z.enum(["send", "accept", "decline", "void"]) })
export type BillingStatusAction = z.infer<typeof billingStatusActionSchema>["action"]

export const recordBillingPaymentSchema = z.object({
  amountKes: z
    .number()
    .gt(0, "Amount must be more than 0")
    .max(1_000_000_000)
    .refine(twoDecimals, "Use at most 2 decimals (cents)"),
  method: z.enum(BILLING_PAYMENT_METHODS),
  reference: text(100),
  paidOn: isoDay,
  note: text(500),
})
export type RecordBillingPaymentInput = z.infer<typeof recordBillingPaymentSchema>

export type BillingTotals = {
  lineAmounts: number[]
  subtotalKes: number
  discountKes: number
  taxKes: number
  feeKes: number
  totalKes: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * The only place document money is computed — the server, the preview and the
 * ops form all call this, so they can never disagree. Order: subtotal, then
 * discount, then tax on the discounted taxable lines, then the extra fee.
 */
export function computeBillingTotals(
  input: Pick<BillingDocumentInput, "lines" | "discountPct" | "taxPct" | "feeKes">
): BillingTotals {
  const lineAmounts = input.lines.map((line) => round2(line.quantity * line.unitPriceKes))
  const subtotalKes = round2(lineAmounts.reduce((sum, amount) => sum + amount, 0))
  const discountKes = round2((subtotalKes * input.discountPct) / 100)
  const taxableGross = lineAmounts.reduce((sum, amount, i) => (input.lines[i]!.taxable ? sum + amount : sum), 0)
  const taxableNet = taxableGross * (1 - input.discountPct / 100)
  const taxKes = round2((taxableNet * input.taxPct) / 100)
  const feeKes = round2(input.feeKes)
  return {
    lineAmounts,
    subtotalKes,
    discountKes,
    taxKes,
    feeKes,
    totalKes: round2(subtotalKes - discountKes + taxKes + feeKes),
  }
}

/** Where an invoice stands on payment; null for quotes, drafts and void documents. */
export function billingPaymentState(
  doc: { kind: BillingDocumentKind; status: BillingDocumentStatus; totalKes: number; paidKes: number; dueDate: string },
  today: string
): BillingPaymentState | null {
  if (doc.kind !== "invoice" || doc.status === "draft" || doc.status === "void") return null
  if (doc.paidKes >= doc.totalKes) return "paid"
  if (doc.dueDate < today) return "overdue"
  if (doc.paidKes > 0) return "part_paid"
  return "unpaid"
}

/** QT/2026/0001, INV/2026/0001 — deliberately unlike Paystack receipts (INV-2026-000123). */
export function formatBillingNumber(kind: BillingDocumentKind, year: number, seq: number): string {
  return `${kind === "quote" ? "QT" : "INV"}/${year}/${String(seq).padStart(4, "0")}`
}

/* ---- DTOs ---- */

/** Extra fields on a `send` response: who the PDF was emailed to, or why it wasn't. */
export type BillingSendOutcome = { emailedTo?: string | null; emailError?: string | null }

export type BillingPaymentDto = {
  id: number
  amountKes: number
  method: BillingPaymentMethod
  reference: string
  paidOn: string
  note: string
  createdAt: string
}

export type BillingDocumentDto = BillingDocumentInput &
  BillingTotals & {
    id: number
    number: string
    status: BillingDocumentStatus
    orgName: string | null
    campaignName: string | null
    paidKes: number
    balanceKes: number
    paymentState: BillingPaymentState | null
    sentAt: string | null
    voidedAt: string | null
    sourceQuoteId: number | null
    convertedInvoiceId: number | null
    payments: BillingPaymentDto[]
    createdAt: string
    updatedAt: string
  }

export type BillingDocumentListItemDto = Pick<
  BillingDocumentDto,
  | "id"
  | "kind"
  | "number"
  | "status"
  | "orgName"
  | "campaignName"
  | "issueDate"
  | "dueDate"
  | "totalKes"
  | "paidKes"
  | "paymentState"
> & { customerName: string }

export type BillingDocumentOptionsDto = {
  orgs: {
    id: number
    name: string
    billingEmail: string | null
    taxPin: string | null
    campaigns: { id: number; name: string }[]
  }[]
  defaults: { note: string; paymentInstructions: string; quoteTerms: string; invoiceTerms: string }
}

export type CustomerBillingDocumentDto = Pick<
  BillingDocumentDto,
  | "id"
  | "kind"
  | "number"
  | "status"
  | "campaignName"
  | "issueDate"
  | "dueDate"
  | "totalKes"
  | "paidKes"
  | "balanceKes"
  | "paymentState"
>

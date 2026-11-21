import { describe, expect, it } from "vitest"

import {
  billingDocumentInputSchema,
  billingPaymentState,
  computeBillingTotals,
  formatBillingNumber,
  recordBillingPaymentSchema,
} from "./billing-document"

const sampleLines = [
  { description: "Discovery and content planning", unit: "hours", quantity: 4, unitPriceKes: 125, taxable: true },
  { description: "Responsive website design", unit: "project", quantity: 1, unitPriceKes: 2400, taxable: true },
]

describe("computeBillingTotals", () => {
  it("sums the SwiftQuote sample with no adjustments", () => {
    const t = computeBillingTotals({ lines: sampleLines, discountPct: 0, taxPct: 0, feeKes: 0 })
    expect(t.lineAmounts).toEqual([500, 2400])
    expect(t.subtotalKes).toBe(2900)
    expect(t.totalKes).toBe(2900)
  })

  it("applies discount before tax on taxable lines", () => {
    const t = computeBillingTotals({ lines: sampleLines, discountPct: 5, taxPct: 16, feeKes: 0 })
    expect(t.discountKes).toBe(145)
    expect(t.taxKes).toBe(440.8)
    expect(t.totalKes).toBe(3195.8)
  })

  it("taxes only the taxable lines", () => {
    const lines = [sampleLines[0]!, { ...sampleLines[1]!, taxable: false }]
    const t = computeBillingTotals({ lines, discountPct: 5, taxPct: 16, feeKes: 0 })
    expect(t.taxKes).toBe(76)
    expect(t.totalKes).toBe(2831)
  })

  it("adds the extra fee after tax", () => {
    const lines = [sampleLines[0]!, { ...sampleLines[1]!, taxable: false }]
    const t = computeBillingTotals({ lines, discountPct: 5, taxPct: 16, feeKes: 1000 })
    expect(t.feeKes).toBe(1000)
    expect(t.totalKes).toBe(3831)
  })

  it("rounds each line to cents", () => {
    const t = computeBillingTotals({
      lines: [{ description: "x", unit: "", quantity: 3, unitPriceKes: 33.333, taxable: false }],
      discountPct: 0,
      taxPct: 0,
      feeKes: 0,
    })
    expect(t.lineAmounts).toEqual([100])
  })
})

describe("billingPaymentState", () => {
  const today = "2026-11-21"
  const invoice = { kind: "invoice" as const, status: "sent" as const, totalKes: 1000, paidKes: 0, dueDate: "2026-12-01" }

  it("is unpaid before the due date with nothing paid", () => {
    expect(billingPaymentState(invoice, today)).toBe("unpaid")
  })
  it("is overdue past the due date", () => {
    expect(billingPaymentState({ ...invoice, dueDate: "2026-11-20" }, today)).toBe("overdue")
  })
  it("is part_paid with some money in and time left", () => {
    expect(billingPaymentState({ ...invoice, paidKes: 400 }, today)).toBe("part_paid")
  })
  it("is overdue when part-paid past the due date", () => {
    expect(billingPaymentState({ ...invoice, paidKes: 400, dueDate: "2026-11-20" }, today)).toBe("overdue")
  })
  it("is paid when fully paid, even past due", () => {
    expect(billingPaymentState({ ...invoice, paidKes: 1000, dueDate: "2026-11-01" }, today)).toBe("paid")
  })
  it("is null for quotes, drafts and void documents", () => {
    expect(billingPaymentState({ ...invoice, kind: "quote" }, today)).toBeNull()
    expect(billingPaymentState({ ...invoice, status: "draft" }, today)).toBeNull()
    expect(billingPaymentState({ ...invoice, status: "void" }, today)).toBeNull()
  })
})

describe("formatBillingNumber", () => {
  it("pads to four digits", () => {
    expect(formatBillingNumber("invoice", 2026, 7)).toBe("INV/2026/0007")
  })
  it("grows past 9999", () => {
    expect(formatBillingNumber("quote", 2026, 12345)).toBe("QT/2026/12345")
  })
})

describe("recordBillingPaymentSchema", () => {
  it("rejects sub-cent amounts that would round to a KES 0.00 payment", () => {
    const base = { method: "bank", paidOn: "2026-11-21" }
    expect(recordBillingPaymentSchema.safeParse({ ...base, amountKes: 0.004 }).success).toBe(false)
    expect(recordBillingPaymentSchema.safeParse({ ...base, amountKes: 0.01 }).success).toBe(true)
  })
})

describe("billingDocumentInputSchema", () => {
  const sample = {
    kind: "quote",
    orgId: null,
    campaignId: null,
    customer: { name: "Nairoutes Limited" },
    issueDate: "2026-10-30",
    dueDate: "2026-11-26",
    lines: sampleLines,
    discountPct: 0,
    taxPct: 0,
  }

  it("accepts the sample and fills defaults", () => {
    const parsed = billingDocumentInputSchema.parse(sample)
    expect(parsed.customer.email).toBe("")
    expect(parsed.feeKes).toBe(0)
  })
  it("rejects a due date before the issue date", () => {
    expect(billingDocumentInputSchema.safeParse({ ...sample, dueDate: "2026-10-01" }).success).toBe(false)
  })
  it("rejects percentages finer than the stored 2 decimals", () => {
    // DECIMAL(5,2) would round 12.345 and the PDF would disagree with the stored total.
    expect(billingDocumentInputSchema.safeParse({ ...sample, discountPct: 12.345 }).success).toBe(false)
    expect(billingDocumentInputSchema.safeParse({ ...sample, taxPct: 16.005 }).success).toBe(false)
    expect(billingDocumentInputSchema.safeParse({ ...sample, discountPct: 12.35 }).success).toBe(true)
  })
  it("rejects a document with no lines", () => {
    expect(billingDocumentInputSchema.safeParse({ ...sample, lines: [] }).success).toBe(false)
  })
})

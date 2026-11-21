import { describe, expect, it } from "vitest"

import type { BillingDocumentInput, InvoiceDto } from "@workspace/ops-contracts"

import { pillFor, previewPdfProps, receiptPdfProps, toBillingPdfProps } from "./pdf-props"

describe("pillFor", () => {
  it("maps every kind, status and payment state to the agreed pill", () => {
    expect(pillFor("invoice", "draft", null)).toEqual({ label: "DRAFT", tone: "grey" })
    expect(pillFor("quote", "draft", null)).toEqual({ label: "DRAFT", tone: "grey" })
    expect(pillFor("invoice", "void", null)).toEqual({ label: "VOID", tone: "grey" })
    expect(pillFor("quote", "void", null)).toEqual({ label: "VOID", tone: "grey" })
    expect(pillFor("quote", "sent", null)).toBeNull()
    expect(pillFor("quote", "accepted", null)).toBeNull()
    expect(pillFor("invoice", "sent", "unpaid")).toEqual({ label: "UNPAID", tone: "red" })
    expect(pillFor("invoice", "sent", "overdue")).toEqual({ label: "OVERDUE", tone: "red" })
    expect(pillFor("invoice", "sent", "part_paid")).toEqual({ label: "PART-PAID", tone: "amber" })
    expect(pillFor("invoice", "sent", "paid")).toEqual({ label: "PAID", tone: "green" })
  })
})

describe("receiptPdfProps", () => {
  const receipt: InvoiceDto = {
    id: 7,
    number: "INV-2026-000123",
    periodStart: "2026-11-02",
    periodEnd: "2026-11-02",
    campaignId: 3,
    campaignName: "Westlands launch",
    subtotalKes: 50000,
    taxKes: 0,
    totalKes: 50000,
    status: "paid",
    issuedOn: "2026-11-02",
    dueOn: "2026-11-02",
    paidAt: "2026-11-02T09:30:00.000Z",
    lines: [{ description: "Campaign #3 budget: Westlands launch", amountKes: 50000 }],
  }
  const org = { name: "Nairoutes Ltd 🚕", billingEmail: "finance@nairoutes.test", taxPin: "P051234567Z" }

  it("renders a Paystack receipt in the same invoice layout, marked PAID", () => {
    const props = receiptPdfProps(receipt, org)
    expect(props).toMatchObject({
      kind: "invoice",
      number: "INV-2026-000123",
      pill: { label: "PAID", tone: "green" },
      issueDate: "2026-11-02",
      campaignName: "Westlands launch",
      totalKes: 50000,
      paidKes: 50000,
      balanceKes: 0,
    })
    expect(props.customer).toMatchObject({ email: "finance@nairoutes.test", taxPin: "P051234567Z" })
    expect(props.customer.name).not.toContain("🚕")
    expect(props.lines).toEqual([
      { description: "Campaign #3 budget: Westlands launch", unit: "", quantity: 1, unitPriceKes: 50000, amountKes: 50000 },
    ])
  })

  it("maps open and overdue receipts to red pills without paid rows", () => {
    expect(receiptPdfProps({ ...receipt, status: "issued", paidAt: null }, org)).toMatchObject({
      pill: { label: "UNPAID", tone: "red" },
      paidKes: null,
    })
    expect(receiptPdfProps({ ...receipt, status: "overdue", paidAt: null }, org).pill).toEqual({ label: "OVERDUE", tone: "red" })
    expect(receiptPdfProps({ ...receipt, status: "void" }, org).pill).toEqual({ label: "VOID", tone: "grey" })
  })

  it("derives the VAT rate so the tax row reads correctly", () => {
    const taxed = { ...receipt, subtotalKes: 10000, taxKes: 1600, totalKes: 11600 }
    expect(receiptPdfProps(taxed, org)).toMatchObject({ taxPct: 16, taxKes: 1600, totalKes: 11600 })
  })
})

describe("toBillingPdfProps", () => {
  const doc: BillingDocumentInput & Parameters<typeof toBillingPdfProps>[0] = {
    kind: "invoice",
    orgId: 1,
    campaignId: null,
    customer: { name: "Café 🐘 Ltd", contact: "", email: "", phone: "", address: "", taxPin: "", reference: "" },
    issueDate: "2026-11-21",
    dueDate: "2026-12-05",
    reference: "",
    lines: [{ description: "Screen time “Q1”", unit: "", quantity: 2, unitPriceKes: 500, taxable: true }],
    discountPct: 0,
    taxPct: 16,
    feeLabel: "",
    feeKes: 0,
    note: "",
    paymentInstructions: "",
    terms: "",
    number: "INV/2026/0001",
    status: "sent",
    campaignName: null,
    paidKes: 0,
    paymentState: "unpaid",
  }

  it("latin1s free text and computes totals", () => {
    const props = toBillingPdfProps(doc)
    expect(props.customer.name).not.toContain("🐘")
    expect(props.lines[0]).toMatchObject({ amountKes: 1000 })
    expect(props.taxKes).toBe(160)
    expect(props.totalKes).toBe(1160)
    expect(props.pill).toEqual({ label: "UNPAID", tone: "red" })
  })

  it("previews a sent document from its saved copy, never the request body", () => {
    const saved = { ...doc, status: "sent" as const }
    const forged = { ...doc, lines: [{ description: "Made up", unit: "", quantity: 1, unitPriceKes: 1, taxable: false }] }
    const props = previewPdfProps(forged, saved, null)
    expect(props.lines).toHaveLength(1)
    expect(props.lines[0]!.description).toMatch(/^Screen time/)
    expect(props.totalKes).toBe(1160)
    expect(props.number).toBe("INV/2026/0001")
  })

  it("previews a draft from the request body, with its saved number", () => {
    const saved = { ...doc, status: "draft" as const }
    const edited = { ...doc, lines: [{ description: "Edited", unit: "", quantity: 1, unitPriceKes: 100, taxable: false }] }
    const props = previewPdfProps(edited, saved, "Westlands")
    expect(props.lines[0]!.description).toBe("Edited")
    expect(props.number).toBe("INV/2026/0001")
    expect(props.campaignName).toBe("Westlands")
    expect(previewPdfProps(edited, null, null)).toMatchObject({ number: null, pill: { label: "DRAFT" } })
  })

  it("shows paid and balance only once money is in", () => {
    expect(toBillingPdfProps(doc)).toMatchObject({ paidKes: null, balanceKes: null })
    expect(toBillingPdfProps({ ...doc, paidKes: 400, paymentState: "part_paid" })).toMatchObject({
      paidKes: 400,
      balanceKes: 760,
    })
  })
})

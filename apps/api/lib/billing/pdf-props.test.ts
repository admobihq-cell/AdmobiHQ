import { describe, expect, it } from "vitest"

import type { BillingDocumentInput } from "@workspace/ops-contracts"

import { pillFor, toBillingPdfProps } from "./pdf-props"

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

  it("shows paid and balance only once money is in", () => {
    expect(toBillingPdfProps(doc)).toMatchObject({ paidKes: null, balanceKes: null })
    expect(toBillingPdfProps({ ...doc, paidKes: 400, paymentState: "part_paid" })).toMatchObject({
      paidKes: 400,
      balanceKes: 760,
    })
  })
})

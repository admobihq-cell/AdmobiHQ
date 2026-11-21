import { describe, expect, it } from "vitest"

import { latin1 } from "../latin1"
import { renderPdf } from "../render-pdf"
import { BILLING_PDF_FOOTER, BillingDocumentPdf, type BillingDocumentPdfProps } from "./billing-document-pdf"

/** The SwiftQuote sample the user supplied (SQ-1001-COPY). */
const sample: BillingDocumentPdfProps = {
  kind: "quote",
  number: "QT/2026/0001",
  pill: null,
  customer: {
    name: "Nairoutes Limited",
    contact: "Alex Draevon",
    email: "amnairoutes@gmail.com",
    phone: "",
    address: "88 Foundry Lane\nPortland, OR 97209",
    taxPin: "",
  },
  issueDate: "2026-10-30",
  dueDate: "2026-11-26",
  reference: "System Quotation",
  campaignName: null,
  lines: [
    { description: "Discovery and content planning", unit: "hours", quantity: 4, unitPriceKes: 125, amountKes: 500 },
    { description: "Responsive website design", unit: "project", quantity: 1, unitPriceKes: 2400, amountKes: 2400 },
  ],
  subtotalKes: 2900,
  discountPct: 0,
  discountKes: 0,
  taxPct: 0,
  taxKes: 0,
  feeLabel: "",
  feeKes: 0,
  totalKes: 2900,
  paidKes: null,
  balanceKes: null,
  note: "Thank you for the opportunity to work together.",
  paymentInstructions: "Payment details will be provided on the invoice.",
  terms: "This quote is valid until the expiry date shown above.",
}

const render = (props: BillingDocumentPdfProps) =>
  renderPdf(<BillingDocumentPdf {...props} />, { footer: BILLING_PDF_FOOTER })

/** Page objects in the file (`/Type /Page`, not the `/Pages` tree node). */
const pageCount = (bytes: Uint8Array) => (Buffer.from(bytes).toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length

const isPdf = (bytes: Uint8Array) => Buffer.from(bytes).subarray(0, 5).toString() === "%PDF-"

describe("BillingDocumentPdf", () => {
  it("renders the SwiftQuote sample to non-empty PDF bytes", async () => {
    const bytes = await render(sample)
    expect(bytes.length).toBeGreaterThan(1000)
    expect(isPdf(bytes)).toBe(true)
  })

  it("renders an invoice with discount, tax, fee, paid and balance rows and an UNPAID pill", async () => {
    const bytes = await render({
      ...sample,
      kind: "invoice",
      number: "INV/2026/0007",
      pill: { label: "UNPAID", tone: "red" },
      customer: { ...sample.customer, taxPin: "P051234567Z" },
      campaignName: "Westlands Q1",
      discountPct: 5,
      discountKes: 145,
      taxPct: 16,
      taxKes: 440.8,
      feeLabel: "Production",
      feeKes: 1000,
      totalKes: 4195.8,
      paidKes: 1000,
      balanceKes: 3195.8,
    })
    expect(isPdf(bytes)).toBe(true)
  })

  it("renders a draft with number null", async () => {
    const bytes = await render({ ...sample, number: null, pill: { label: "DRAFT", tone: "grey" } })
    expect(isPdf(bytes)).toBe(true)
  })

  it("renders non-latin1 input", async () => {
    const name = latin1("Café “Ndovu” 🐘 Ltd")
    await expect(
      render({ ...sample, customer: { ...sample.customer, name }, note: latin1("Asante sana 🙏") })
    ).resolves.toBeInstanceOf(Uint8Array)
  })

  it("renders a multi-page document", async () => {
    const short = await render(sample)
    const lines = Array.from({ length: 40 }, (_, i) => ({
      description: `Screen time block ${i + 1}`,
      unit: "day",
      quantity: 1,
      unitPriceKes: 1000,
      amountKes: 1000,
    }))
    const long = await render({ ...sample, lines, subtotalKes: 40000, totalKes: 40000 })
    expect(pageCount(short)).toBe(1)
    expect(pageCount(long)).toBeGreaterThanOrEqual(2)
  })
})

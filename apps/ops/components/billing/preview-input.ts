const num = (value: unknown, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback)
const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "")
const day = (value: unknown, fallback: string) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback)
const clampPct = (value: unknown) => Math.round(Math.min(100, Math.max(0, num(value))) * 100) / 100

/**
 * An unfinished form, coerced into something the server will render: blanks become
 * placeholders and out-of-range numbers are clamped. Only the preview sees this —
 * saving still runs the strict schema, so nothing invalid is ever stored.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial form state of any shape
export function previewable(raw: any): unknown {
  const today = new Date().toISOString().slice(0, 10)
  const issueDate = day(raw?.issueDate, today)
  const dueDate = day(raw?.dueDate, issueDate)
  const email = str(raw?.customer?.email, 200).trim()
  const lines = (Array.isArray(raw?.lines) ? raw.lines : [])
    .slice(0, 100)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((line: any) => ({
      description: str(line?.description, 300).trim() || "Item description",
      unit: str(line?.unit, 30),
      quantity: num(line?.quantity) > 0 ? Math.min(num(line?.quantity), 1_000_000) : 1,
      unitPriceKes: Math.min(Math.max(num(line?.unitPriceKes), 0), 1_000_000_000),
      taxable: line?.taxable !== false,
    }))
  return {
    kind: raw?.kind === "quote" ? "quote" : "invoice",
    orgId: num(raw?.orgId) > 0 ? raw.orgId : null,
    campaignId: num(raw?.campaignId) > 0 ? raw.campaignId : null,
    customer: {
      name: str(raw?.customer?.name, 200).trim() || "Customer name",
      contact: str(raw?.customer?.contact, 200),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
      phone: str(raw?.customer?.phone, 40),
      address: str(raw?.customer?.address, 500),
      taxPin: str(raw?.customer?.taxPin, 20),
      reference: str(raw?.customer?.reference, 100),
    },
    issueDate,
    dueDate: dueDate < issueDate ? issueDate : dueDate,
    reference: str(raw?.reference, 100),
    lines: lines.length > 0 ? lines : [{ description: "Item description", unit: "", quantity: 1, unitPriceKes: 0, taxable: true }],
    discountPct: clampPct(raw?.discountPct),
    taxPct: clampPct(raw?.taxPct),
    feeLabel: str(raw?.feeLabel, 60),
    feeKes: Math.min(Math.max(num(raw?.feeKes), 0), 1_000_000_000),
    note: str(raw?.note, 2000),
    paymentInstructions: str(raw?.paymentInstructions, 2000),
    terms: str(raw?.terms, 2000),
  }
}

import type { CSSProperties, ReactElement, ReactNode } from "react"

import {
  BrandHeader,
  BrandPage,
  CUSTOMER_PDF_FOOTER,
  INK,
  LABEL,
  MUTED,
  NUMERIC,
  TABLE_CELL,
  TABLE_HEAD_CELL,
  TotalBar,
} from "@/lib/pdf/primitives/brand"

export type PdfPill = {
  label: "UNPAID" | "OVERDUE" | "PART-PAID" | "PAID" | "VOID" | "DRAFT"
  tone: "red" | "amber" | "green" | "grey"
}

export type BillingDocumentPdfProps = {
  kind: "quote" | "invoice"
  number: string | null
  pill: PdfPill | null
  customer: { name: string; contact: string; email: string; phone: string; address: string; taxPin: string }
  issueDate: string
  dueDate: string
  reference: string
  campaignName: string | null
  lines: { description: string; unit: string; quantity: number; unitPriceKes: number; amountKes: number }[]
  subtotalKes: number
  discountPct: number
  discountKes: number
  taxPct: number
  taxKes: number
  feeLabel: string
  feeKes: number
  totalKes: number
  paidKes: number | null
  balanceKes: number | null
  note: string
  paymentInstructions: string
  terms: string
}

const PILL_COLORS: Record<PdfPill["tone"], { color: string; backgroundColor: string }> = {
  red: { color: "#b91c1c", backgroundColor: "#fee2e2" },
  amber: { color: "#b45309", backgroundColor: "#fef3c7" },
  green: { color: "#15803d", backgroundColor: "#dcfce7" },
  grey: { color: "#4b5563", backgroundColor: "#f3f4f6" },
}

const kesFormat = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ksh = (value: number) => `${value < 0 ? "-" : ""}Ksh ${kesFormat.format(Math.abs(value))}`
const qty = (value: number) => (Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000))
const pct = (value: number) => `${Number(value.toFixed(2))}%`

/** Splits typed multi-line text (addresses, notes) into lines, dropping blanks. */
const linesOf = (text: string) => text.split(/\r?\n/).filter((line) => line.trim() !== "")

/** Kept for existing imports; every customer document shares one footer. */
export const BILLING_PDF_FOOTER = CUSTOMER_PDF_FOOTER

function Paragraphs({ text, style }: { text: string; style?: CSSProperties }): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", ...style }}>
      {linesOf(text).map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </div>
  )
}

function Pill({ pill }: { pill: PdfPill }): ReactElement {
  return (
    <span
      style={{
        ...PILL_COLORS[pill.tone],
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.1em",
        padding: "4px 10px",
        borderRadius: 999,
        marginTop: 10,
      }}
    >
      {pill.label}
    </span>
  )
}

function KeyValue({ rows }: { rows: [string, string][] }): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 250 }}>
      {rows.map(([key, value]) => (
        <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: INK }}>{key}</span>
          <span style={{ color: INK, textAlign: "right" }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 18 }}>
      <span style={{ ...LABEL, marginBottom: 6 }}>{label}</span>
      {children}
    </div>
  )
}

/**
 * A quote or invoice, laid out after the SwiftQuote sample the user supplied.
 * Every string must already be latin1()-safe — the caller (pdf-props.tsx) does
 * that, so this stays a pure layout.
 */
export function BillingDocumentPdf(props: BillingDocumentPdfProps): ReactElement {
  const { kind, customer } = props
  const customerLines = [
    customer.contact,
    ...linesOf(customer.address),
    customer.email,
    customer.phone,
    customer.taxPin ? `KRA PIN ${customer.taxPin}` : "",
  ].filter(Boolean)

  const meta: [string, string][] = [
    ["Issue date", props.issueDate],
    [kind === "quote" ? "Expiry date" : "Due date", props.dueDate],
  ]
  if (props.reference) meta.push(["Reference", props.reference])
  if (props.campaignName) meta.push(["Campaign", props.campaignName])

  const totals: [string, string][] = [["Subtotal", ksh(props.subtotalKes)]]
  if (props.discountKes > 0) totals.push([`Discount (${pct(props.discountPct)})`, ksh(-props.discountKes)])
  if (props.taxKes > 0) totals.push([`VAT (${pct(props.taxPct)})`, ksh(props.taxKes)])
  if (props.feeKes > 0) totals.push([props.feeLabel || "Additional fee", ksh(props.feeKes)])

  return (
    <BrandPage>
      <BrandHeader
        title={kind === "quote" ? "Quotation" : "Invoice"}
        subtitle={props.number ?? "DRAFT"}
        badge={props.pill ? <Pill pill={props.pill} /> : null}
      />

      {/* Who it's for + dates */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 300 }}>
          <span style={{ ...LABEL, marginBottom: 8 }}>{kind === "quote" ? "Prepared for" : "Bill to"}</span>
          <span style={{ fontWeight: 700, marginBottom: 3 }}>{customer.name}</span>
          <div style={{ display: "flex", flexDirection: "column", color: MUTED, lineHeight: 1.55 }}>
            {customerLines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </div>
        </div>
        <KeyValue rows={meta} />
      </div>

      {/* Line items — real table markup so the header repeats across pages */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TABLE_HEAD_CELL, textAlign: "left" }}>Description</th>
            <th style={{ ...TABLE_HEAD_CELL, ...NUMERIC, width: 60 }}>Qty</th>
            <th style={{ ...TABLE_HEAD_CELL, ...NUMERIC, width: 110 }}>Rate</th>
            <th style={{ ...TABLE_HEAD_CELL, ...NUMERIC, width: 120 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {props.lines.map((line, i) => (
            <tr key={i} style={{ breakInside: "avoid" }}>
              <td style={TABLE_CELL}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 700 }}>{line.description}</span>
                  {line.unit ? <span style={{ color: MUTED, fontSize: 9, marginTop: 3 }}>{line.unit}</span> : null}
                </div>
              </td>
              <td style={{ ...TABLE_CELL, ...NUMERIC }}>{qty(line.quantity)}</td>
              <td style={{ ...TABLE_CELL, ...NUMERIC }}>{ksh(line.unitPriceKes)}</td>
              <td style={{ ...TABLE_CELL, ...NUMERIC }}>{ksh(line.amountKes)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes on the left, totals on the right */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 24, breakInside: "avoid" }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 330, lineHeight: 1.5 }}>
          {props.note ? (
            <Section label="Note">
              <Paragraphs text={props.note} />
            </Section>
          ) : null}
          {props.paymentInstructions ? (
            <Section label="Payment instructions">
              <Paragraphs text={props.paymentInstructions} />
            </Section>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 270 }}>
          {totals.map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0 10px 8px" }}>
              <span>{label}</span>
              <span style={NUMERIC}>{value}</span>
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
            <TotalBar label="Total" value={ksh(props.totalKes)} />
          </div>
          {props.paidKes !== null && props.balanceKes !== null ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px 6px" }}>
                <span>Paid</span>
                <span style={NUMERIC}>{ksh(-props.paidKes)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px", fontWeight: 700 }}>
                <span>Balance due</span>
                <span style={NUMERIC}>{ksh(props.balanceKes)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {props.terms ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderTop: `1px solid ${INK}`,
            marginTop: 30,
            paddingTop: 18,
            lineHeight: 1.5,
            breakInside: "avoid",
          }}
        >
          <span style={{ ...LABEL, marginBottom: 6 }}>Terms and conditions</span>
          <Paragraphs text={props.terms} />
        </div>
      ) : null}
    </BrandPage>
  )
}

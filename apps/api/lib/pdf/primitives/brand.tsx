import type { CSSProperties, ReactElement, ReactNode } from "react"
import { PageNumber, TotalPages } from "takumi-pdf/primitives"

import { ADMOBI_COMPANY } from "@/lib/billing/company"
import { WORDMARK_SRC } from "@/lib/pdf/logo-typemark"

/*
 * The customer-facing document look, shared by invoices, quotes and every
 * finance statement: black and grey type, letter-spaced labels, the brand
 * colour only in the logo. Ops' internal exports keep DocumentShell.
 */

export const INK = "#0a0a0a"
export const MUTED = "#6b7280"
export const HAIRLINE = "#e5e7eb"

/** Letter-spaced uppercase section label ("PREPARED FOR", "NOTE"). */
export const LABEL: CSSProperties = {
  fontSize: 8.5,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: INK,
}

/** Right-aligned, tabular, never wrapping — every money column. */
export const NUMERIC: CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }

export const TABLE_HEAD_CELL: CSSProperties = { ...LABEL, padding: "0 10px 9px", borderBottom: `1.5px solid ${INK}` }
export const TABLE_CELL: CSSProperties = { padding: "11px 10px", verticalAlign: "top", borderBottom: `1px solid ${HAIRLINE}` }

/** Repeating per-page footer for anything an advertiser receives. */
export const CUSTOMER_PDF_FOOTER: ReactElement = (
  // The footer band spans the full page width; 56px lines it up with the body
  // (48px page margin + the body's 8px inset).
  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "0 56px 18px", fontSize: 8.5, color: "#9ca3af" }}>
    <span>Admobi Media · admobihq.com</span>
    <span>
      Page <PageNumber /> of <TotalPages />
    </span>
  </div>
)

/** Page body wrapper: the 8px inset the footer lines up with. */
export function BrandPage({ children }: { children: ReactNode }): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", fontSize: 10.5, color: INK, padding: "8px 8px 0" }}>
      {children}
    </div>
  )
}

/**
 * Logo, company name and contact lines on the left; the document title, its
 * number or subtitle, and an optional status badge on the right; a black rule.
 */
export function BrandHeader({
  title,
  subtitle,
  badge,
}: {
  title: string
  subtitle?: string | null
  badge?: ReactNode
}): ReactElement {
  const company = ADMOBI_COMPANY
  const companyLines = [
    company.contactPerson,
    company.city,
    company.email,
    company.phone,
    company.website,
    company.taxPin ? `KRA PIN ${company.taxPin}` : "",
  ].filter(Boolean)

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Source is 201x112 — fixed size keeps the aspect ratio */}
          <img src={WORDMARK_SRC} alt="Admobi" style={{ width: 92, height: 51.3 }} />
          <span style={{ fontSize: 19, fontWeight: 700, marginTop: 10 }}>{company.name}</span>
          <div style={{ display: "flex", flexDirection: "column", color: MUTED, marginTop: 6, lineHeight: 1.55 }}>
            {companyLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: 330 }}>
          <span style={{ fontSize: title.length > 14 ? 22 : 28, fontWeight: 800, letterSpacing: "0.01em", textAlign: "right" }}>
            {title.toUpperCase()}
          </span>
          {subtitle ? (
            <span style={{ fontSize: 10.5, fontWeight: 700, marginTop: 6, textAlign: "right" }}>{subtitle}</span>
          ) : null}
          {badge}
        </div>
      </div>
      <div style={{ borderTop: `1.5px solid ${INK}`, marginTop: 22, marginBottom: 22 }} />
    </>
  )
}

/** The black total bar under a table of money. */
export function TotalBar({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: INK,
        color: "#ffffff",
        padding: "10px 12px",
        fontWeight: 700,
      }}
    >
      <span style={{ fontSize: 14 }}>{label}</span>
      <span style={{ ...NUMERIC, fontSize: 14 }}>{value}</span>
    </div>
  )
}

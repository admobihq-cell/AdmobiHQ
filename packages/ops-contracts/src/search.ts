/**
 * Command palette search: the result shape the three search endpoints return, and the one parser
 * that decides whether a query is an id (`#42`), a billing document number (`inv-2026-1`), a payout
 * reference or a provider reference, so every endpoint reads the same query the same way.
 */

export type SearchHit = { id: string; title: string; subtitle?: string; href: string; badge?: string }
export type SearchGroup = { key: string; label: string; hits: SearchHit[] }
export type SearchResponseDto = { query: string; groups: SearchGroup[] }

export type ParsedSearch = {
  /** Trimmed, at most SEARCH_MAX_QUERY characters. */
  text: string
  /** `#42` or `42` (1–9 digits). */
  numericId: number | null
  /** Canonical `INV/2026/0001` or `QT/2026/0001`. */
  documentNumber: string | null
  /** Lower-cased `adm-payout-…`. */
  payoutReference: string | null
  /** The text when it's a single token of 6+ characters (a Paystack or wallet reference), else null. */
  reference: string | null
}

export const SEARCH_MAX_QUERY = 100
export const SEARCH_GROUP_LIMIT = 5

const ID_RE = /^#?(\d{1,9})$/
const DOCUMENT_RE = /^(INV|QT)[\s/_-]*(\d{4})[\s/_-]*(\d{1,4})$/i

export function parseSearchQuery(q: string): ParsedSearch {
  const text = q.trim().slice(0, SEARCH_MAX_QUERY)
  const id = ID_RE.exec(text)
  const doc = DOCUMENT_RE.exec(text)
  const lower = text.toLowerCase()
  return {
    text,
    numericId: id ? Number(id[1]) : null,
    documentNumber: doc ? `${doc[1]!.toUpperCase()}/${doc[2]}/${doc[3]!.padStart(4, "0")}` : null,
    payoutReference: lower.startsWith("adm-payout-") ? lower : null,
    reference: text.length >= 6 && !/\s/.test(text) ? text : null,
  }
}

/** Escapes LIKE/ILIKE wildcards so user input matches literally (default `\` escape). */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export function shouldSearch(q: string): boolean {
  const parsed = parseSearchQuery(q)
  return parsed.text.length >= 2 || parsed.numericId !== null || parsed.documentNumber !== null
}

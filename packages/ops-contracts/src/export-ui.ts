/** "%PDF-" in base64. The PDF route can answer 200 with an error page behind a proxy; never share that as a PDF. */
export const isPdfBase64 = (base64: string): boolean => base64.startsWith("JVBERi0")

/** A cell for CSV or PDF: a missing value is an empty cell, not "null". */
export const cellText = (value: string | number | null | undefined): string => (value == null ? "" : String(value))

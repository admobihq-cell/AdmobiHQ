/**
 * Count-up figures: split a displayed value ("KES 18,420", "38%", "1.2K") into the one number
 * to animate and the text around it, then re-render part-way values in the same shape. Anything
 * that isn't exactly one number (a date, "12 of 40", "—") returns null and is shown as-is.
 */
export type CountUpParts = { prefix: string; value: number; decimals: number; grouped: boolean; suffix: string }

const PATTERN = /^([^\d]*?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?([^\d]*)$/

export function splitCountUp(display: string): CountUpParts | null {
  const match = PATTERN.exec(display.trim())
  if (!match) return null
  const [, prefix = "", whole = "", fraction = "", suffix = ""] = match
  if (/[\d.]/.test(suffix) || /\d/.test(prefix)) return null
  return {
    prefix,
    value: Number(`${whole.replace(/,/g, "")}${fraction ? `.${fraction}` : ""}`),
    decimals: fraction.length,
    grouped: whole.includes(","),
    suffix,
  }
}

export function formatCountUp(parts: CountUpParts, value: number): string {
  const number = value.toLocaleString("en-KE", {
    minimumFractionDigits: parts.decimals,
    maximumFractionDigits: parts.decimals,
    useGrouping: parts.grouped || Math.abs(parts.value) >= 10_000,
  })
  return `${parts.prefix}${number}${parts.suffix}`
}

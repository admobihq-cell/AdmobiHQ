/** Sitewide freshness signal for marketing pages and schema dateModified. */
export const SEO_LAST_UPDATED = "2026-06-01"

export function formatLastUpdatedLabel(isoDate: string = SEO_LAST_UPDATED): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  return date.toLocaleDateString("en-KE", { month: "long", year: "numeric", timeZone: "UTC" })
}

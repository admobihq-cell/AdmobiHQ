import { renderAnnouncementTemplate, type AnnouncementTemplateVars } from "./announcement-template"

/** Push notification limits: what fits on a lock screen. The same numbers `broadcastCreateSchema` enforces. */
export const ANNOUNCEMENT_TITLE_MAX = 65
export const ANNOUNCEMENT_BODY_MAX = 178

export type PreviewAudience = "customer" | "driver"

/** Sample values for the composer preview. Drivers have no organisation, so `{{org_name}}` renders empty for them. */
export const PREVIEW_AUDIENCES: Record<PreviewAudience, { label: string; appName: string; vars: AnnouncementTemplateVars }> = {
  customer: { label: "Customer", appName: "Admobi", vars: { firstName: "Jordan", orgName: "Acme Ads" } },
  driver: { label: "Driver", appName: "Admobi Driver", vars: { firstName: "Jordan" } },
}

const TOKEN_PATTERN = /\{\{\s*(first_name|org_name)\s*\}\}/

export const hasTemplateTokens = (...texts: string[]): boolean => texts.some((text) => TOKEN_PATTERN.test(text))

/** The audiences a send reaches (customer first), so the preview can switch between them. Falls back to customer. */
export function previewAudiences(targetApps: string[]): PreviewAudience[] {
  const found = (Object.keys(PREVIEW_AUDIENCES) as PreviewAudience[]).filter((a) => targetApps.some((app) => app.startsWith(a)))
  return found.length ? found : ["customer"]
}

/** `template` as a recipient in `audience` would see it. */
export const previewFor = (audience: PreviewAudience, template: string): string =>
  renderAnnouncementTemplate(template, PREVIEW_AUDIENCES[audience].vars)

/**
 * Puts `token` where the cursor is (or over the selected range) and says where the cursor goes next.
 * Null when the result would pass `max`, as on the web: the tag is not squeezed in by cutting text.
 * With no cursor yet it appends.
 */
export function insertAtSelection(
  value: string,
  token: string,
  selection: { start: number; end: number } | null,
  max: number,
): { value: string; cursor: number } | null {
  const start = selection?.start ?? value.length
  const end = selection?.end ?? value.length
  const next = value.slice(0, start) + token + value.slice(end)
  return next.length > max ? null : { value: next, cursor: start + token.length }
}

/** The line under a campaign's review status: "Funded · KES 12,500 held" or "Not funded". */
export function campaignFundingLabel(fundedAt: string | null, budgetKes: string | null): string {
  if (!fundedAt) return "Not funded"
  return `Funded · KES ${Number(budgetKes ?? 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })} held`
}

/** How a broadcast went: reached, unreachable (token removed) and awaiting a receipt, never summing past the target. */
export function announcementDelivery(a: { target_count: number; delivered_count: number; invalid_count: number }) {
  const target = a.target_count
  const delivered = Math.min(a.delivered_count, target)
  const invalid = Math.min(a.invalid_count, target - delivered)
  const unconfirmed = Math.max(target - delivered - invalid, 0)
  const pct = (n: number) => (target ? (n / target) * 100 : 0)
  return { target, delivered, invalid, unconfirmed, deliveredPct: pct(delivered), invalidPct: pct(invalid) }
}

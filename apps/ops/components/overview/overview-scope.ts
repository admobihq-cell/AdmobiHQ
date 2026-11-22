import type { OpsPermission } from "@workspace/ops-contracts"

import type { OverviewForm } from "@/components/overview/overview-dashboard"

type Named = Array<{ name: string; value: number }>

type OverviewStatsRow = {
  totals: Record<OverviewForm, number>
  byType: Named
  budgetMix: Named
  driversByCity: Named
}

/** Each public form, the permission that opens its list page, and its byType label. */
export const OVERVIEW_FORMS: Array<{ key: OverviewForm; permission: OpsPermission; label: string }> = [
  { key: "leads", permission: "leads", label: "Campaign Leads" },
  { key: "fleet", permission: "fleet", label: "Fleet Partners" },
  { key: "drivers", permission: "drivers", label: "Drivers" },
  { key: "waitlist", permission: "waitlist", label: "Waitlist" },
  { key: "mediaKit", permission: "media_kit", label: "Media Kit" },
]

/** Cuts the overview stats down to the forms the viewer can open; null when they can open none. */
export function scopeSubmissions(overview: OverviewStatsRow | null, has: (p: OpsPermission) => boolean) {
  const forms = OVERVIEW_FORMS.filter((f) => has(f.permission))
  if (!overview || forms.length === 0) return null

  const labels = new Set(forms.map((f) => f.label))
  return {
    forms: forms.map((f) => ({ key: f.key, value: overview.totals[f.key] })),
    total: forms.reduce((sum, f) => sum + overview.totals[f.key], 0),
    byType: overview.byType.filter((t) => labels.has(t.name)),
    budgetMix: has("leads") ? overview.budgetMix : null,
    driversByCity: has("drivers") ? overview.driversByCity : null,
  }
}

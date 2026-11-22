import type { OpsPermission } from "@workspace/ops-contracts"

import type { DateRangeKey } from "@/lib/queries/stats"
import { getActionQueue } from "@/lib/queries/action-queue"
import { getPipeline } from "@/lib/queries/campaign-analytics"
import { getContentStats } from "@/lib/queries/content"
import { getOverviewStats, getSubmissionsOverTime } from "@/lib/queries/stats"
import { getOpsUser } from "@/lib/auth"
import { OverviewDashboard } from "@/components/overview/overview-dashboard"
import { OVERVIEW_FORMS, scopeSubmissions } from "@/components/overview/overview-scope"

type OverviewStatsProps = {
  range: DateRangeKey
}

/**
 * Overview is the landing page, so everyone signed in can open it. What it shows is cut down here,
 * on the server, to what the viewer could see by opening the matching section — the dashboard is a
 * client component, so anything passed to it reaches the browser.
 */
export async function OverviewStats({ range }: OverviewStatsProps) {
  let data: Awaited<ReturnType<typeof loadOverview>>
  try {
    data = await loadOverview(range)
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load dashboard data. Check that secrets are loaded with `npm run env:pull -w ops`."
    return <OverviewDashboard error={message} />
  }
  return <OverviewDashboard data={data} />
}

async function loadOverview(range: DateRangeKey) {
  const days =
    range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 365 : 30

  const user = await getOpsUser()
  const has = (permission: OpsPermission) =>
    user !== null && (user.role === "admin" || user.permissions.includes(permission))

  const forms = OVERVIEW_FORMS.filter((f) => has(f.permission))
  // ponytail: the timeline is one UNION over all five forms, so it shows only to someone who can
  // open every form. Split the query per form if partial viewers need the chart.
  const allForms = forms.length === OVERVIEW_FORMS.length

  const [overview, timeline, content, actions, booked] = await Promise.all([
    forms.length > 0 ? getOverviewStats(range) : Promise.resolve(null),
    allForms ? getSubmissionsOverTime(days) : Promise.resolve(null),
    has("content") ? getContentStats() : Promise.resolve(null),
    getActionQueue(has, range),
    // Booked budget is money: it needs both the campaigns dashboard and finances.
    has("campaigns") && has("finances") ? getPipeline(range, true).then((p) => p.bookedKes) : Promise.resolve(null),
  ])

  const submissions = scopeSubmissions(overview, has)

  return { submissions, timeline, content, actions, booked }
}

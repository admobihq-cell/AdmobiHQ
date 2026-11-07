import type { OpsPermission } from "@workspace/ops-contracts"

import type { DateRangeKey } from "@/lib/queries/stats"
import { getActionQueue } from "@/lib/queries/action-queue"
import { getPipeline } from "@/lib/queries/campaign-analytics"
import { getContentStats } from "@/lib/queries/content"
import { getOverviewStats, getSubmissionsOverTime } from "@/lib/queries/stats"
import { getOpsUser } from "@/lib/auth"
import { OverviewDashboard } from "@/components/overview/overview-dashboard"

type OverviewStatsProps = {
  range: DateRangeKey
}

export async function OverviewStats({ range }: OverviewStatsProps) {
  const days =
    range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 365 : 30

  try {
    const user = await getOpsUser()
    const has = (permission: OpsPermission) =>
      user !== null && (user.role === "admin" || user.permissions.includes(permission))

    const [overview, timeline, content, actions, booked] = await Promise.all([
      getOverviewStats(range),
      getSubmissionsOverTime(days),
      getContentStats(),
      getActionQueue(has, range),
      // Booked budget is money: it needs both the campaigns dashboard and finances.
      has("campaigns") && has("finances") ? getPipeline(range, true).then((p) => p.bookedKes) : Promise.resolve(null),
    ])

    return <OverviewDashboard data={{ overview, timeline, content, actions, booked }} />
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load dashboard data. Check that secrets are loaded with `npm run env:pull -w ops`."

    return <OverviewDashboard error={message} />
  }
}

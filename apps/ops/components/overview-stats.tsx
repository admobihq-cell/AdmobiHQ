import type { DateRangeKey } from "@/lib/queries/stats"
import { getContentStats } from "@/lib/queries/content"
import { getOverviewStats, getSubmissionsOverTime } from "@/lib/queries/stats"
import { OverviewDashboard } from "@/components/overview-dashboard"

type OverviewStatsProps = {
  range: DateRangeKey
}

export async function OverviewStats({ range }: OverviewStatsProps) {
  const days =
    range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 365 : 30

  try {
    const [overview, timeline, content] = await Promise.all([
      getOverviewStats(range),
      getSubmissionsOverTime(days),
      getContentStats(),
    ])

    return <OverviewDashboard data={{ overview, timeline, content }} />
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load dashboard data. Check that secrets are loaded with `npm run env:pull -w ops`."

    return <OverviewDashboard error={message} />
  }
}

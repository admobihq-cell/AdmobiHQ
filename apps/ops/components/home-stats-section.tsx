import { getOverviewStats } from "@/lib/queries/stats"
import { OpsHomeStats } from "@/components/ops-home-stats"

export async function HomeStatsSection() {
  try {
    const overview = await getOverviewStats("30d")
    const stats = {
      leads: overview.totals.leads,
      fleet: overview.totals.fleet,
      drivers: overview.totals.drivers,
      waitlist: overview.totals.waitlist,
      mediaKit: overview.totals.mediaKit,
      total: overview.totals.all,
    }

    return <OpsHomeStats stats={stats} />
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load the 30-day snapshot. Check database connectivity or run `npm run env:pull -w ops`."

    return <OpsHomeStats stats={null} error={message} />
  }
}

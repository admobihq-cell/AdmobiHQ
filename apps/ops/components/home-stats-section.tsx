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
  } catch {
    return <OpsHomeStats stats={null} />
  }
}

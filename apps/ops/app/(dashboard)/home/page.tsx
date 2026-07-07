import { OpsHome } from "@/components/ops-home"
import { getOpsUser } from "@/lib/auth"
import { getOverviewStats } from "@/lib/queries/stats"

export default async function HomePage() {
  const user = await getOpsUser()
  const rawName =
    user?.user?.firstName?.trim() ||
    user?.email.split("@")[0] ||
    "there"
  const displayName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1)

  let stats: {
    leads: number
    fleet: number
    drivers: number
    waitlist: number
    mediaKit: number
    total: number
  } | null = null

  try {
    const overview = await getOverviewStats("30d")
    stats = {
      leads: overview.totals.leads,
      fleet: overview.totals.fleet,
      drivers: overview.totals.drivers,
      waitlist: overview.totals.waitlist,
      mediaKit: overview.totals.mediaKit,
      total: overview.totals.all,
    }
  } catch {
    stats = null
  }

  return (
    <OpsHome
      displayName={displayName}
      email={user?.email ?? "@admobihq.com"}
      stats={stats}
    />
  )
}

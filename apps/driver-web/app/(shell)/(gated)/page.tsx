import { payoutDestinationLabel } from "@workspace/ops-contracts"

import { DashboardView } from "@/components/overview/dashboard-view"
import { fetchDriverProfile } from "@/lib/driver-profile"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  // Cached per driver (5 min) and already fetched by the (gated) layout.
  const result = await fetchDriverProfile()
  const destination = result.status === "ok" ? payoutDestinationLabel(result.profile) : null

  return <DashboardView payoutDestination={destination} />
}

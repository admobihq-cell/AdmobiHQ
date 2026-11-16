import { payoutDestinationLabel } from "@workspace/ops-contracts"

import { EarningsView } from "@/components/overview/earnings-view"
import { fetchDriverProfile } from "@/lib/driver-profile"

export const metadata = { title: "Earnings" }

export default async function EarningsPage() {
  const result = await fetchDriverProfile()
  const destination = result.status === "ok" ? payoutDestinationLabel(result.profile) : null

  return <EarningsView payoutDestination={destination} />
}

import { redirect } from "next/navigation"

import { OpsMapView } from "@/components/maps/ops-map-view"
import { requireOpsPermission } from "@/lib/auth"

export const metadata = { title: "Map" }

// Same permission as the Fleet dashboard: the map is the fleet, live.
export default async function MapPage() {
  try {
    await requireOpsPermission("drivers")
  } catch {
    redirect("/overview")
  }

  return <OpsMapView />
}

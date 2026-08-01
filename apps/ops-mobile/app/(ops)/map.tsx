import { OpsMap } from "@/components/maps/ops-map"
import { usePageHeader } from "@/lib/page-header"

export default function MapScreen() {
  usePageHeader("Network map", { showBack: true, backHref: "/(ops)/profile" })
  return <OpsMap />
}

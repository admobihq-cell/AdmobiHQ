import { EntityPageChrome } from "@/components/entity/entity-page-chrome"
import { FLEET_PAGE } from "@/lib/entity-pages"

export default function FleetLoading() {
  return <EntityPageChrome {...FLEET_PAGE} loading />
}

import { EntityPageChrome } from "@/components/entity-page-chrome"
import { DRIVERS_PAGE } from "@/lib/entity-pages"

export default function DriversLoading() {
  return <EntityPageChrome {...DRIVERS_PAGE} loading />
}

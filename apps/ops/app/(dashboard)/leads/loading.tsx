import { EntityPageChrome } from "@/components/entity/entity-page-chrome"
import { LEADS_PAGE } from "@/lib/entity-pages"

export default function LeadsLoading() {
  return <EntityPageChrome {...LEADS_PAGE} loading />
}

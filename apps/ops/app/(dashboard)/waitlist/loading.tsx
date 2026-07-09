import { EntityPageChrome } from "@/components/entity-page-chrome"
import { WAITLIST_PAGE } from "@/lib/entity-pages"

export default function WaitlistLoading() {
  return <EntityPageChrome {...WAITLIST_PAGE} loading />
}

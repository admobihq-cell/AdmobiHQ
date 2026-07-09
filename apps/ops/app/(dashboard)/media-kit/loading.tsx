import { EntityPageChrome } from "@/components/entity-page-chrome"
import { MEDIA_KIT_PAGE } from "@/lib/entity-pages"

export default function MediaKitLoading() {
  return <EntityPageChrome {...MEDIA_KIT_PAGE} loading />
}

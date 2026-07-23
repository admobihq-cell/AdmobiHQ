import { useCallback } from "react"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function MediaKitScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number) => client.mediaKit.list({ page, pageSize: 20 }),
    [client],
  )

  return (
    <EntityList
      title="Media kit"
      description="Marketers and agencies who requested the Admobi media kit."
      loadPage={loadPage}
      addHref="/(ops)/media-kit/new"
      getTitle={(item) => item.name}
      getSubtitle={(item) => item.email}
      getInitials={(item) => item.name}
      searchKeys={[(item) => item.name, (item) => item.email]}
      detailHref={(id) => `/(ops)/media-kit/${id}`}
    />
  )
}

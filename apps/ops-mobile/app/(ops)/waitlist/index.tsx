import { useCallback } from "react"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function WaitlistScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number) => client.waitlist.list({ page, pageSize: 20 }),
    [client],
  )

  return (
    <EntityList
      title="Waitlist"
      description="Early-interest emails from homepage and other launch CTAs."
      loadPage={loadPage}
      addHref="/(ops)/waitlist/new"
      getTitle={(item) => item.email}
      getSubtitle={(item) => item.source ?? "Unknown source"}
      getInitials={(item) => item.email}
      searchKeys={[(item) => item.email, (item) => item.source]}
      detailHref={(id) => `/(ops)/waitlist/${id}`}
    />
  )
}

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
      loadPage={loadPage}
      getTitle={(item) => item.email}
      getSubtitle={(item) => item.source ?? "unknown source"}
      detailHref={(id) => `/(ops)/waitlist/${id}`}
    />
  )
}

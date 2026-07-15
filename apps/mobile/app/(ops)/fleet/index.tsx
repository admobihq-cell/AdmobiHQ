import { useCallback } from "react"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function FleetScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number) => client.fleet.list({ page, pageSize: 20 }),
    [client],
  )

  return (
    <EntityList
      title="Fleet partners"
      loadPage={loadPage}
      getTitle={(item) => item.company_name}
      getSubtitle={(item) => `${item.primary_contact_name} · ${item.city}`}
      detailHref={(id) => `/(ops)/fleet/${id}`}
    />
  )
}

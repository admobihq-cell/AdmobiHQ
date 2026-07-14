import { useCallback } from "react"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function DriversScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number) => client.drivers.list({ page, pageSize: 20 }),
    [client],
  )

  return (
    <EntityList
      title="Drivers"
      loadPage={loadPage}
      getTitle={(item) => item.name}
      getSubtitle={(item) => `${item.phone} · ${item.city}`}
      detailHref={(id) => `/(ops)/drivers/${id}`}
    />
  )
}

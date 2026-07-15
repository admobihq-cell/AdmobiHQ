import { useCallback } from "react"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function LeadsScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number) => client.leads.list({ page, pageSize: 20 }),
    [client],
  )

  return (
    <EntityList
      title="Campaign leads"
      loadPage={loadPage}
      getTitle={(item) => item.company_name}
      getSubtitle={(item) => `${item.contact_name} · ${item.email}`}
      detailHref={(id) => `/(ops)/leads/${id}`}
    />
  )
}

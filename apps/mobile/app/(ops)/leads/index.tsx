import { useCallback } from "react"
import { LEAD_STATUSES } from "@workspace/ops-contracts"
import { formatLabel } from "@workspace/ops-contracts"

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
      getInitials={(item) => item.company_name}
      getFilterValue={(item) => item.status}
      filterOptions={LEAD_STATUSES.map((status) => ({
        key: status,
        label: formatLabel(status),
      }))}
      searchKeys={[
        (item) => item.company_name,
        (item) => item.contact_name,
        (item) => item.email,
      ]}
      detailHref={(id) => `/(ops)/leads/${id}`}
    />
  )
}

import { useCallback } from "react"
import { FLEET_STATUSES } from "@workspace/ops-contracts"
import { formatLabel } from "@workspace/ops-contracts"

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
      getInitials={(item) => item.company_name}
      getFilterValue={(item) => item.status}
      filterOptions={FLEET_STATUSES.map((status) => ({
        key: status,
        label: formatLabel(status),
      }))}
      searchKeys={[
        (item) => item.company_name,
        (item) => item.primary_contact_name,
        (item) => item.email,
        (item) => item.city,
      ]}
      detailHref={(id) => `/(ops)/fleet/${id}`}
    />
  )
}

import { useCallback } from "react"
import { FLEET_STATUSES, formatLabel } from "@workspace/ops-contracts"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function FleetScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number, options?: { status?: string | null }) =>
      client.fleet.list({
        page,
        pageSize: 20,
        status: options?.status ?? undefined,
      }),
    [client],
  )

  return (
    <EntityList
      title="Fleet partners"
      description="Onboard and track fleet partner applications across cities."
      loadPage={loadPage}
      addHref="/(ops)/fleet/new"
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

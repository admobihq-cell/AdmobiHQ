import { useCallback } from "react"
import { DRIVER_STATUSES, formatLabel } from "@workspace/ops-contracts"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function DriversScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number, options?: { status?: string | null }) =>
      client.drivers.list({
        page,
        pageSize: 20,
        status: options?.status ?? undefined,
      }),
    [client],
  )

  return (
    <EntityList
      title="Drivers"
      description="Monitor driver signups, city distribution, and onboarding status."
      loadPage={loadPage}
      addHref="/(ops)/drivers/new"
      getTitle={(item) => item.name}
      getSubtitle={(item) => `${item.phone} · ${item.city}`}
      getInitials={(item) => item.name}
      getFilterValue={(item) => item.status}
      filterOptions={DRIVER_STATUSES.map((status) => ({
        key: status,
        label: formatLabel(status),
      }))}
      searchKeys={[
        (item) => item.name,
        (item) => item.phone,
        (item) => item.email,
        (item) => item.city,
      ]}
      detailHref={(id) => `/(ops)/drivers/${id}`}
    />
  )
}

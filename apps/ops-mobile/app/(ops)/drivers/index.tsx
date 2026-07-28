import { useCallback } from "react"
import { DRIVER_STATUSES, formatLabel } from "@workspace/ops-contracts"

import { DriverListRow } from "@/components/app/entity-list-rows"
import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function DriversScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number, options?: { status?: string | null; search?: string | null }) =>
      client.drivers.list({
        page,
        pageSize: 20,
        status: options?.status ?? undefined,
        search: options?.search ?? undefined,
      }),
    [client],
  )

  return (
    <EntityList
      entity="drivers"
      title="Drivers"
      description="Monitor driver signups, city distribution, and onboarding status."
      loadPage={loadPage}
      addHref="/(ops)/drivers/new"
      filterOptions={DRIVER_STATUSES.map((status) => ({
        key: status,
        label: formatLabel(status),
      }))}
      detailHref={(id) => `/(ops)/drivers/${id}`}
      renderRow={(item, { onPress }) => (
        <DriverListRow item={item} onPress={onPress} />
      )}
    />
  )
}

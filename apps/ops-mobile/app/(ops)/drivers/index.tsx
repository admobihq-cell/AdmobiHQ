import { useCallback } from "react"
import {
  DRIVER_STATUSES,
  DRIVER_STATUS_OPTIONS,
  formatLabel,
} from "@workspace/ops-contracts"

import { DriverListRow } from "@/components/app/entity-list-rows"
import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function DriversScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (
      page: number,
      options?: { status?: string | null; search?: string | null }
    ) =>
      client.drivers.list({
        page,
        pageSize: 20,
        status: options?.status ?? undefined,
        search: options?.search ?? undefined,
      }),
    [client]
  )
  const onBulkStatusChange = useCallback(
    (ids: number[], status: string) =>
      Promise.all(
        ids.map((id) => client.drivers.update(id, { status: status as never }))
      ),
    [client]
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
      statusOptions={DRIVER_STATUS_OPTIONS}
      onBulkStatusChange={onBulkStatusChange}
      detailHref={(id) => `/(ops)/drivers/${id}`}
      renderRow={(item, { onPress }) => (
        <DriverListRow item={item} onPress={onPress} />
      )}
    />
  )
}

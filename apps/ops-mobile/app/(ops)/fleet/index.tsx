import { useCallback } from "react"
import {
  FLEET_STATUSES,
  FLEET_STATUS_OPTIONS,
  formatLabel,
} from "@workspace/ops-contracts"

import { FleetListRow } from "@/components/app/entity-list-rows"
import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function FleetScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (
      page: number,
      options?: { status?: string | null; search?: string | null }
    ) =>
      client.fleet.list({
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
        ids.map((id) => client.fleet.update(id, { status: status as never }))
      ),
    [client]
  )
  const onBulkDelete = useCallback(
    (ids: number[]) => client.fleet.bulk({ action: "delete", ids }),
    [client]
  )

  return (
    <EntityList
      entity="fleet"
      title="Fleet partners"
      description="Onboard and track fleet partner applications across cities."
      loadPage={loadPage}
      addHref="/(ops)/fleet/new"
      filterOptions={FLEET_STATUSES.map((status) => ({
        key: status,
        label: formatLabel(status),
      }))}
      statusOptions={FLEET_STATUS_OPTIONS}
      onBulkStatusChange={onBulkStatusChange}
      onBulkDelete={onBulkDelete}
      detailHref={(id) => `/(ops)/fleet/${id}`}
      renderRow={(item, { onPress, onLongPress }) => (
        <FleetListRow item={item} onPress={onPress} onLongPress={onLongPress} />
      )}
    />
  )
}

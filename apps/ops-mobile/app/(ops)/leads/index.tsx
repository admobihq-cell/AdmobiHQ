import { useCallback } from "react"
import {
  LEAD_STATUSES,
  LEAD_STATUS_OPTIONS,
  formatLabel,
} from "@workspace/ops-contracts"

import { LeadListRow } from "@/components/app/entity-list-rows"
import { EntityList } from "@/components/EntityList"
import { Megaphone } from "@/components/icons"
import { useOpsClient } from "@/lib/ops-client"

export default function LeadsScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (
      page: number,
      options?: { status?: string | null; search?: string | null }
    ) =>
      client.leads.list({
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
        ids.map((id) => client.leads.update(id, { status: status as never }))
      ),
    [client]
  )
  const onBulkDelete = useCallback(
    (ids: number[]) => client.leads.bulk({ action: "delete", ids }),
    [client]
  )

  return (
    <EntityList
      entity="leads"
      title="Campaign leads"
      description="Review and manage inbound campaign interest from advertisers."
      icon={Megaphone}
      loadPage={loadPage}
      addHref="/(ops)/leads/new"
      filterOptions={LEAD_STATUSES.map((status) => ({
        key: status,
        label: formatLabel(status),
      }))}
      statusOptions={LEAD_STATUS_OPTIONS}
      onBulkStatusChange={onBulkStatusChange}
      onBulkDelete={onBulkDelete}
      detailHref={(id) => `/(ops)/leads/${id}`}
      renderRow={(item, { onPress, onLongPress }) => (
        <LeadListRow item={item} onPress={onPress} onLongPress={onLongPress} />
      )}
    />
  )
}

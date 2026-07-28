import { useCallback } from "react"
import { LEAD_STATUSES, formatLabel } from "@workspace/ops-contracts"

import { LeadListRow } from "@/components/app/entity-list-rows"
import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function LeadsScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number, options?: { status?: string | null; search?: string | null }) =>
      client.leads.list({
        page,
        pageSize: 20,
        status: options?.status ?? undefined,
        search: options?.search ?? undefined,
      }),
    [client],
  )

  return (
    <EntityList
      entity="leads"
      title="Campaign leads"
      description="Review and manage inbound campaign interest from advertisers."
      loadPage={loadPage}
      addHref="/(ops)/leads/new"
      filterOptions={LEAD_STATUSES.map((status) => ({
        key: status,
        label: formatLabel(status),
      }))}
      detailHref={(id) => `/(ops)/leads/${id}`}
      renderRow={(item, { onPress }) => (
        <LeadListRow item={item} onPress={onPress} />
      )}
    />
  )
}

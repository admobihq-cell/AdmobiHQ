import { useCallback } from "react"
import { LEAD_STATUSES, formatLabel } from "@workspace/ops-contracts"

import { EntityList } from "@/components/EntityList"
import { useOpsClient } from "@/lib/ops-client"

export default function LeadsScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number, options?: { status?: string | null }) =>
      client.leads.list({
        page,
        pageSize: 20,
        status: options?.status ?? undefined,
      }),
    [client],
  )

  return (
    <EntityList
      title="Campaign leads"
      description="Review and manage inbound campaign interest from advertisers."
      loadPage={loadPage}
      addHref="/(ops)/leads/new"
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

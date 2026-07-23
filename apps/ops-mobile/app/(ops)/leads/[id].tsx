import { useCallback } from "react"
import { LEAD_STATUS_OPTIONS } from "@workspace/ops-contracts"

import { detailValue, EntityDetail } from "@/components/EntityDetail"
import { useOpsClient } from "@/lib/ops-client"

export default function LeadDetailScreen() {
  const client = useOpsClient()
  const load = useCallback((id: number) => client.leads.get(id), [client])
  const remove = useCallback((id: number) => client.leads.delete(id), [client])

  return (
    <EntityDetail
      load={load}
      remove={remove}
      editHref={(recordId) => `/(ops)/leads/edit/${recordId}`}
      statusOptions={LEAD_STATUS_OPTIONS}
      getStatus={(item) => item.status}
      onStatusChange={(recordId, status) =>
        client.leads.update(recordId, { status: status as never })
      }
      title={(item) => item.company_name}
      chips={(item) => [
        ...(item.budget_range
          ? [{ label: detailValue(item.budget_range), variant: "muted" as const }]
          : []),
      ]}
      sections={(item) => [
        {
          title: "Contact",
          fields: [
            { label: "Contact name", value: item.contact_name },
            { label: "Email", value: item.email, copyable: true },
            { label: "Phone", value: item.phone, copyable: true, callable: true },
          ],
        },
        {
          title: "Campaign",
          fields: [
            { label: "Audience", value: item.audience },
            { label: "Cities", value: detailValue(item.cities) },
            { label: "Formats", value: detailValue(item.ad_formats) },
            { label: "Duration", value: detailValue(item.duration) },
            { label: "Start date", value: detailValue(item.campaign_start_date) },
            { label: "Notes", value: item.additional_info },
          ],
        },
        {
          title: "Metadata",
          fields: [
            { label: "Created", value: detailValue(item.created_at) },
            { label: "Updated", value: detailValue(item.updated_at) },
          ],
        },
      ]}
    />
  )
}

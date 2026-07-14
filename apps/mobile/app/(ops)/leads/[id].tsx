import { useCallback } from "react"

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
      title={(item) => item.company_name}
      fields={(item) => [
        { label: "Contact", value: item.contact_name },
        { label: "Email", value: item.email },
        { label: "Phone", value: item.phone },
        { label: "Status", value: detailValue(item.status) },
        { label: "Budget", value: detailValue(item.budget_range) },
        { label: "Cities", value: detailValue(item.cities) },
        { label: "Formats", value: detailValue(item.ad_formats) },
        { label: "Duration", value: detailValue(item.duration) },
        { label: "Notes", value: item.additional_info },
        { label: "Created", value: detailValue(item.created_at) },
      ]}
    />
  )
}

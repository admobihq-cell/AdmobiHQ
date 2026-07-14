import { useCallback } from "react"

import { detailValue, EntityDetail } from "@/components/EntityDetail"
import { useOpsClient } from "@/lib/ops-client"

export default function FleetDetailScreen() {
  const client = useOpsClient()
  const load = useCallback((id: number) => client.fleet.get(id), [client])
  const remove = useCallback((id: number) => client.fleet.delete(id), [client])

  return (
    <EntityDetail
      load={load}
      remove={remove}
      title={(item) => item.company_name}
      fields={(item) => [
        { label: "Contact", value: item.primary_contact_name },
        { label: "Email", value: item.email },
        { label: "Phone", value: item.phone },
        { label: "City", value: item.city },
        { label: "Status", value: detailValue(item.status) },
        { label: "Fleet types", value: detailValue(item.fleet_types) },
        { label: "Fleet size", value: item.fleet_size },
        { label: "Vehicles active", value: detailValue(item.vehicles_active) },
        { label: "Notes", value: item.notes },
        { label: "Created", value: detailValue(item.created_at) },
      ]}
    />
  )
}

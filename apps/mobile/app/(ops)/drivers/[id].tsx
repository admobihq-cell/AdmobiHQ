import { useCallback } from "react"

import { detailValue, EntityDetail } from "@/components/EntityDetail"
import { useOpsClient } from "@/lib/ops-client"

export default function DriverDetailScreen() {
  const client = useOpsClient()
  const load = useCallback((id: number) => client.drivers.get(id), [client])
  const remove = useCallback(
    (id: number) => client.drivers.delete(id),
    [client],
  )

  return (
    <EntityDetail
      load={load}
      remove={remove}
      title={(item) => item.name}
      fields={(item) => [
        { label: "Phone", value: item.phone },
        { label: "Email", value: item.email },
        { label: "City", value: item.city },
        { label: "Status", value: detailValue(item.status) },
        { label: "Vehicle", value: detailValue(item.vehicle_type) },
        { label: "Days / week", value: detailValue(item.days_per_week) },
        { label: "Heard about", value: detailValue(item.heard_about) },
        { label: "Notes", value: item.notes },
        { label: "Created", value: detailValue(item.created_at) },
      ]}
    />
  )
}

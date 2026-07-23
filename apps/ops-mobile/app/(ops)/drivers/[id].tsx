import { useCallback } from "react"
import { DRIVER_STATUS_OPTIONS } from "@workspace/ops-contracts"

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
      editHref={(recordId) => `/(ops)/drivers/edit/${recordId}`}
      statusOptions={DRIVER_STATUS_OPTIONS}
      getStatus={(item) => item.status}
      onStatusChange={(recordId, status) =>
        client.drivers.update(recordId, { status: status as never })
      }
      title={(item) => item.name}
      chips={(item) => [{ label: item.city, variant: "muted" as const }]}
      sections={(item) => [
        {
          title: "Contact",
          fields: [
            { label: "Phone", value: item.phone, copyable: true, callable: true },
            { label: "Email", value: item.email, copyable: true },
          ],
        },
        {
          title: "Details",
          fields: [
            { label: "Vehicle type", value: detailValue(item.vehicle_type) },
            { label: "Days per week", value: detailValue(item.days_per_week) },
            { label: "Heard about", value: detailValue(item.heard_about) },
            { label: "Notes", value: item.notes },
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

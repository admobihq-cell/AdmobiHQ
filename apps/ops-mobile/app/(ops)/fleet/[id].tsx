import { useCallback } from "react"
import { FLEET_STATUS_OPTIONS } from "@workspace/ops-contracts"

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
      editHref={(recordId) => `/(ops)/fleet/edit/${recordId}`}
      statusOptions={FLEET_STATUS_OPTIONS}
      getStatus={(item) => item.status}
      onStatusChange={(recordId, status) =>
        client.fleet.update(recordId, { status: status as never })
      }
      title={(item) => item.company_name}
      sections={(item) => [
        {
          title: "Contact",
          fields: [
            { label: "Primary contact", value: item.primary_contact_name },
            { label: "Email", value: item.email, copyable: true },
            { label: "Phone", value: item.phone, copyable: true, callable: true },
          ],
        },
        {
          title: "Fleet details",
          fields: [
            { label: "City", value: item.city },
            { label: "Fleet types", value: detailValue(item.fleet_types) },
            { label: "Fleet size", value: item.fleet_size },
            { label: "Vehicles active", value: detailValue(item.vehicles_active) },
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

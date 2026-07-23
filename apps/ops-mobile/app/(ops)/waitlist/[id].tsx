import { useCallback } from "react"

import { detailValue, EntityDetail } from "@/components/EntityDetail"
import { useOpsClient } from "@/lib/ops-client"

export default function WaitlistDetailScreen() {
  const client = useOpsClient()
  const load = useCallback((id: number) => client.waitlist.get(id), [client])
  const remove = useCallback(
    (id: number) => client.waitlist.delete(id),
    [client],
  )

  return (
    <EntityDetail
      load={load}
      remove={remove}
      editHref={(recordId) => `/(ops)/waitlist/edit/${recordId}`}
      title={(item) => item.email}
      chips={(item) =>
        item.source
          ? [{ label: detailValue(item.source), variant: "muted" as const }]
          : []
      }
      sections={(item) => [
        {
          title: "Details",
          fields: [
            { label: "Email", value: item.email, copyable: true },
            { label: "Source", value: item.source },
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

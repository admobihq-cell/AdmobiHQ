import { useCallback } from "react"

import { detailValue, EntityDetail } from "@/components/EntityDetail"
import { useOpsClient } from "@/lib/ops-client"

export default function MediaKitDetailScreen() {
  const client = useOpsClient()
  const load = useCallback((id: number) => client.mediaKit.get(id), [client])
  const remove = useCallback(
    (id: number) => client.mediaKit.delete(id),
    [client],
  )

  return (
    <EntityDetail
      load={load}
      remove={remove}
      title={(item) => item.name}
      sections={(item) => [
        {
          title: "Contact",
          fields: [
            { label: "Email", value: item.email, copyable: true },
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

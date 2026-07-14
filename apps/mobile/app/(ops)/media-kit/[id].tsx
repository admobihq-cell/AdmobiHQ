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
      fields={(item) => [
        { label: "Email", value: item.email },
        { label: "Created", value: detailValue(item.created_at) },
      ]}
    />
  )
}

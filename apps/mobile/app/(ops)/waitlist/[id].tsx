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
      title={(item) => item.email}
      fields={(item) => [
        { label: "Source", value: item.source },
        { label: "Created", value: detailValue(item.created_at) },
      ]}
    />
  )
}

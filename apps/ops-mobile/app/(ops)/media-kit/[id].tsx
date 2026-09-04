import { useCallback } from "react"

import { detailValue, EntityDetail } from "@/components/EntityDetail"
import { useOpsClient } from "@/lib/ops-client"

export default function MediaKitDetailScreen() {
  const client = useOpsClient()
  const load = useCallback((id: number) => client.mediaKit.get(id), [client])
  const remove = useCallback(
    (id: number) => client.mediaKit.delete(id),
    [client]
  )

  return (
    <EntityDetail
      entity="mediaKit"
      load={load}
      remove={remove}
      editHref={(recordId) => `/(ops)/media-kit/edit/${recordId}`}
      backHref="/(ops)/media-kit"
      title={(item) => item.name}
      sections={(item) => [
        {
          title: "Contact",
          fields: [
            { label: "Email", value: item.email, copyable: true },
            { label: "Company", value: item.company },
            { label: "Role", value: item.role },
            { label: "Evaluating for", value: item.use_case },
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

import { formatDateTime } from "@workspace/ops-contracts"
import { useCallback } from "react"

import { EntityList } from "@/components/entity/EntityList"
import { FileText } from "@/components/icons"
import { useOpsClient } from "@/lib/ops-client"

export default function MediaKitScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number, options?: { search?: string | null }) =>
      client.mediaKit.list({
        page,
        pageSize: 20,
        search: options?.search ?? undefined,
      }),
    [client],
  )

  return (
    <EntityList
      entity="mediaKit"
      title="Media kit"
      description="Marketers and agencies who requested the Admobi media kit."
      icon={FileText}
      loadPage={loadPage}
      addHref="/(ops)/media-kit/new"
      getTitle={(item) => item.name}
      getSubtitle={(item) => item.email}
      getInitials={(item) => item.name}
      exports={{
        entity: "media_kit",
        columns: [
          { header: "Date", value: (r) => formatDateTime(r.created_at) },
        { header: "Name", value: (r) => r.name },
        { header: "Email", value: (r) => r.email },
        { header: "Company", value: (r) => r.company },
        ],
      }}
      detailHref={(id) => `/(ops)/media-kit/${id}`}
    />
  )
}

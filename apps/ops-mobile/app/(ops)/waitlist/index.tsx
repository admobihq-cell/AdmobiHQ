import { useCallback } from "react"

import { EntityList } from "@/components/EntityList"
import { Mail } from "@/components/icons"
import { useOpsClient } from "@/lib/ops-client"

export default function WaitlistScreen() {
  const client = useOpsClient()
  const loadPage = useCallback(
    (page: number, options?: { search?: string | null }) =>
      client.waitlist.list({
        page,
        pageSize: 20,
        search: options?.search ?? undefined,
      }),
    [client],
  )

  return (
    <EntityList
      entity="waitlist"
      title="Waitlist"
      description="Early-interest emails from homepage and other launch CTAs."
      icon={Mail}
      loadPage={loadPage}
      addHref="/(ops)/waitlist/new"
      getTitle={(item) => item.email}
      getSubtitle={(item) => item.source ?? "Unknown source"}
      getInitials={(item) => item.email}
      detailHref={(id) => `/(ops)/waitlist/${id}`}
    />
  )
}

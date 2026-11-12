import { useQuery } from "@tanstack/react-query"

import { useOpsAuthReady, useOpsClient } from "@/lib/ops-client"

export const actionQueueKey = ["ops-action-queue"] as const

/** The attention queue behind the header bell. Every ops user may read it; the API filters rows to their permissions. */
export function useActionQueue() {
  const client = useOpsClient()
  return useQuery({
    queryKey: actionQueueKey,
    queryFn: () => client.actionQueue.list("30d"),
    enabled: useOpsAuthReady(),
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

/**
 * Queue rows link to ops-console paths (`/dashboards/fleet`, `/finances?tab=payouts`). Every one of
 * those exists under `(ops)` in this app with the same name, and the screens read `?tab=`.
 */
export const mobileHref = (webHref: string) => `/(ops)${webHref}`

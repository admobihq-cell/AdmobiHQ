import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatDateTime } from "@workspace/ops-contracts"

import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"
import { entityKeys } from "@/lib/query-keys"

export type RecentSubmission = {
  id: number
  type: "lead" | "fleet" | "driver"
  title: string
  subtitle: string
  created_at: string
  href: string
}

export function useRecentSubmissions(limit = 8) {
  const authReady = useOpsAuthReady()
  const client = useOpsClient()

  const leadsQuery = useQuery({
    queryKey: entityKeys.recent("leads"),
    queryFn: () => client.leads.list({ page: 1, pageSize: 5 }),
    enabled: authReady,
  })
  const fleetQuery = useQuery({
    queryKey: entityKeys.recent("fleet"),
    queryFn: () => client.fleet.list({ page: 1, pageSize: 5 }),
    enabled: authReady,
  })
  const driversQuery = useQuery({
    queryKey: entityKeys.recent("drivers"),
    queryFn: () => client.drivers.list({ page: 1, pageSize: 5 }),
    enabled: authReady,
  })

  const queryError = leadsQuery.error ?? fleetQuery.error ?? driversQuery.error

  const items = useMemo<RecentSubmission[]>(() => {
    const merged: RecentSubmission[] = [
      ...(leadsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        type: "lead" as const,
        title: item.company_name,
        subtitle: `${item.contact_name} · ${formatDateTime(item.created_at)}`,
        created_at: item.created_at,
        href: `/(ops)/leads/${item.id}`,
      })),
      ...(fleetQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        type: "fleet" as const,
        title: item.company_name,
        subtitle: `${item.primary_contact_name} · ${formatDateTime(item.created_at)}`,
        created_at: item.created_at,
        href: `/(ops)/fleet/${item.id}`,
      })),
      ...(driversQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        type: "driver" as const,
        title: item.name,
        subtitle: `${item.city} · ${formatDateTime(item.created_at)}`,
        created_at: item.created_at,
        href: `/(ops)/drivers/${item.id}`,
      })),
    ]

    merged.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return merged.slice(0, limit)
  }, [leadsQuery.data, fleetQuery.data, driversQuery.data, limit])

  return {
    items,
    loading: leadsQuery.isPending || fleetQuery.isPending || driversQuery.isPending,
    error: queryError ? formatOpsError(queryError, API_URL) : null,
    refetch: async () => {
      await Promise.all([
        leadsQuery.refetch(),
        fleetQuery.refetch(),
        driversQuery.refetch(),
      ])
    },
  }
}

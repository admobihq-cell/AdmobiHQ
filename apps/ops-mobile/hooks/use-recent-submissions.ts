import { useCallback, useEffect, useRef, useState } from "react"
import { formatDateTime } from "@workspace/ops-contracts"

import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"

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
  const [items, setItems] = useState<RecentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const refetch = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const [leads, fleet, drivers] = await Promise.all([
        client.leads.list({ page: 1, pageSize: 5 }),
        client.fleet.list({ page: 1, pageSize: 5 }),
        client.drivers.list({ page: 1, pageSize: 5 }),
      ])

      const merged: RecentSubmission[] = [
        ...leads.items.map((item) => ({
          id: item.id,
          type: "lead" as const,
          title: item.company_name,
          subtitle: `${item.contact_name} · ${formatDateTime(item.created_at)}`,
          created_at: item.created_at,
          href: `/(ops)/leads/${item.id}`,
        })),
        ...fleet.items.map((item) => ({
          id: item.id,
          type: "fleet" as const,
          title: item.company_name,
          subtitle: `${item.primary_contact_name} · ${formatDateTime(item.created_at)}`,
          created_at: item.created_at,
          href: `/(ops)/fleet/${item.id}`,
        })),
        ...drivers.items.map((item) => ({
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

      if (requestId.current === id) setItems(merged.slice(0, limit))
    } catch (err) {
      if (requestId.current === id) setError(formatOpsError(err, API_URL))
    } finally {
      if (requestId.current === id) setLoading(false)
    }
  }, [client, limit])

  useEffect(() => {
    if (!authReady) return
    void refetch()
  }, [authReady, refetch])

  return { items, loading, error, refetch }
}

import { useCallback, useEffect, useState } from "react"
import type { DateRangeKey, StatsResponseDto } from "@workspace/ops-contracts"

import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"

export function useDashboardStats(initialRange: DateRangeKey = "30d") {
  const client = useOpsClient()
  const [range, setRange] = useState<DateRangeKey>(initialRange)
  const [stats, setStats] = useState<StatsResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const data = await client.stats.get({ range })
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) setError(formatOpsError(err, API_URL))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchStats()
    return () => {
      cancelled = true
    }
  }, [client, range, tick])

  return { stats, loading, error, range, setRange, refetch }
}

import { useCallback, useEffect, useRef, useState } from "react"
import type { DateRangeKey, StatsResponseDto } from "@workspace/ops-contracts"

import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"

export function useDashboardStats(initialRange: DateRangeKey = "30d") {
  const authReady = useOpsAuthReady()
  const client = useOpsClient()
  const [range, setRange] = useState<DateRangeKey>(initialRange)
  const [stats, setStats] = useState<StatsResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const refetch = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const data = await client.stats.get({ range })
      if (requestId.current === id) setStats(data)
    } catch (err) {
      if (requestId.current === id) setError(formatOpsError(err, API_URL))
    } finally {
      if (requestId.current === id) setLoading(false)
    }
  }, [client, range])

  useEffect(() => {
    if (!authReady) return
    void refetch()
  }, [authReady, refetch])

  return { stats, loading, error, range, setRange, refetch }
}

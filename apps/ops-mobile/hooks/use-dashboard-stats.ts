import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"
import { statsKeys } from "@/lib/query-keys"

export function useDashboardStats(initialRange: DateRangeKey = "30d") {
  const authReady = useOpsAuthReady()
  const client = useOpsClient()
  const [range, setRange] = useState<DateRangeKey>(initialRange)

  const query = useQuery({
    queryKey: statsKeys.stats(range),
    queryFn: () => client.stats.get({ range }),
    enabled: authReady,
    placeholderData: keepPreviousData,
  })

  return {
    stats: query.data ?? null,
    loading: query.isPending || query.isFetching,
    error: query.error ? formatOpsError(query.error, API_URL) : null,
    range,
    setRange,
    refetch: async () => {
      await query.refetch()
    },
  }
}

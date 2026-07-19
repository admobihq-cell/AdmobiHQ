import { useMemo, useRef } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { createOpsClient, type OpsClient } from "@workspace/ops-api-client"

import { API_URL } from "@/lib/env"

export function useOpsClient(): OpsClient {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useMemo(
    () =>
      createOpsClient({
        baseUrl: API_URL,
        getToken: () => getTokenRef.current(),
      }),
    [],
  )
}

export { API_URL }

/** @deprecated Use API_URL */
export { API_URL as OPS_URL }

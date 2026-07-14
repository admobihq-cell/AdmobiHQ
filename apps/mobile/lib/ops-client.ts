import { useMemo, useRef } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { createOpsClient, type OpsClient } from "@workspace/ops-api-client"

import { OPS_URL } from "@/lib/env"

export function useOpsClient(): OpsClient {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useMemo(
    () =>
      createOpsClient({
        baseUrl: OPS_URL,
        getToken: () => getTokenRef.current(),
      }),
    [],
  )
}

export { OPS_URL }

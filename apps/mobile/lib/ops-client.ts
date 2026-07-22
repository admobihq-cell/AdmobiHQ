import { useMemo, useRef } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { createOpsClient, OpsApiError, type OpsClient } from "@workspace/ops-api-client"

import { API_URL } from "@/lib/env"

export function useOpsClient(): OpsClient {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useMemo(
    () =>
      createOpsClient({
        baseUrl: API_URL,
        getToken: async () => {
          if (!isLoaded) {
            throw new OpsApiError("Auth is still loading. Try again in a moment.", 401)
          }
          if (!isSignedIn) {
            throw new OpsApiError("Session expired. Sign out and sign in again.", 401)
          }

          const token = await getTokenRef.current()
          if (!token) {
            throw new OpsApiError("Session expired. Sign out and sign in again.", 401)
          }

          return token
        },
      }),
    [isLoaded, isSignedIn],
  )
}

export { API_URL }

/** @deprecated Use API_URL */
export { API_URL as OPS_URL }

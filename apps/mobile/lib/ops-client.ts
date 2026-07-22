import { useMemo, useRef } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { createOpsClient, type OpsClient } from "@workspace/ops-api-client"

import { API_URL } from "@/lib/env"

async function resolveSessionToken(
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  const token = await getToken()
  if (token) {
    return token
  }

  // Clerk may need a moment to attach the session right after setActive().
  await new Promise((resolve) => setTimeout(resolve, 250))
  return getToken()
}

export function useOpsClient(): OpsClient {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  return useMemo(
    () =>
      createOpsClient({
        baseUrl: API_URL,
        getToken: () => resolveSessionToken(() => getTokenRef.current()),
      }),
    [],
  )
}

export { API_URL }

/** @deprecated Use API_URL */
export { API_URL as OPS_URL }

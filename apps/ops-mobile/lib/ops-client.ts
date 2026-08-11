import { useMemo, useRef } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { useQuery } from "@tanstack/react-query"
import { createOpsClient, OpsApiError, type OpsClient } from "@workspace/ops-api-client"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { API_URL } from "@/lib/env"
import { meKeys } from "@/lib/query-keys"

const TOKEN_RETRY_MS = [0, 150, 300, 600, 1000]

async function resolveSessionToken(
  getToken: () => Promise<string | null>,
  isSignedIn: boolean,
): Promise<string | null> {
  if (!isSignedIn) {
    return null
  }

  for (const delayMs of TOKEN_RETRY_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const token = await getToken()
    if (token) {
      return token
    }
  }

  return null
}

export function useOpsAuthReady(): boolean {
  const { isLoaded, isSignedIn } = useAuth()
  return isLoaded && isSignedIn
}

export function useOpsClient(): OpsClient {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const authRef = useRef({ isLoaded, isSignedIn })
  authRef.current = { isLoaded, isSignedIn }
  const inFlightTokenRef = useRef<Promise<string | null> | null>(null)

  return useMemo(
    () =>
      createOpsClient({
        baseUrl: API_URL,
        getToken: async () => {
          const { isLoaded: loaded, isSignedIn: signedIn } = authRef.current
          if (!loaded) {
            throw new OpsApiError("Signing in… try again in a moment.", 401)
          }
          if (!signedIn) {
            throw new OpsApiError("You are signed out.", 401)
          }

          // Concurrent callers (e.g. dashboard's parallel requests on mount) share one
          // in-flight resolution instead of each independently walking the retry ladder.
          if (!inFlightTokenRef.current) {
            inFlightTokenRef.current = resolveSessionToken(
              () => getTokenRef.current(),
              signedIn,
            ).finally(() => {
              inFlightTokenRef.current = null
            })
          }
          const token = await inFlightTokenRef.current
          if (!token) {
            throw new OpsApiError(
              "Could not read your Clerk session token. Sign out, sign in again, and confirm the app uses the same Clerk keys as the API.",
              401,
            )
          }

          return token
        },
      }),
    [],
  )
}

/**
 * The signed-in member's role + section permissions, for filtering nav to
 * what apps/ops (web) already gates via ops-shell.tsx's canSee(). Defaults
 * to "member" / no permissions while loading, so gated destinations stay
 * hidden until we actually know rather than flashing then disappearing.
 */
export function useOpsAccess(): { role: OpsRole; permissions: OpsPermission[]; loading: boolean } {
  const authReady = useOpsAuthReady()
  const client = useOpsClient()

  const query = useQuery({
    queryKey: meKeys.me(),
    queryFn: () => client.me.get(),
    enabled: authReady,
    staleTime: 60_000,
  })

  return {
    role: query.data?.role ?? "member",
    permissions: query.data?.permissions ?? [],
    loading: authReady && query.isPending,
  }
}

export { API_URL }

/** @deprecated Use API_URL */
export { API_URL as OPS_URL }

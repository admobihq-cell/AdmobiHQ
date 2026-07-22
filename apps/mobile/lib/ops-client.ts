import { useMemo, useRef } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { createOpsClient, OpsApiError, type OpsClient } from "@workspace/ops-api-client"

import { API_URL } from "@/lib/env"

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

          const token = await resolveSessionToken(
            () => getTokenRef.current(),
            signedIn,
          )
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

export { API_URL }

/** @deprecated Use API_URL */
export { API_URL as OPS_URL }

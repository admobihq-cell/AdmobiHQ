"use client"

import { useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import { createOpsClient, type OpsClient } from "@workspace/ops-api-client"

export function useOpsClient(): OpsClient {
  const { getToken } = useAuth()

  return useMemo(
    () =>
      createOpsClient({
        baseUrl: "",
        getToken: async () => getToken(),
      }),
    [getToken],
  )
}

export function resolveOpsResource(client: OpsClient, apiPath: string) {
  switch (apiPath) {
    case "/api/leads":
      return client.leads
    case "/api/fleet":
      return client.fleet
    case "/api/drivers":
      return client.drivers
    case "/api/waitlist":
      return client.waitlist
    case "/api/media-kit":
      return client.mediaKit
    default:
      throw new Error(`Unknown ops API path: ${apiPath}`)
  }
}

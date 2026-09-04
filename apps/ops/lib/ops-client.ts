"use client"

import { useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import {
  createOpsClient,
  getApiBaseUrl,
  type OpsClient,
} from "@workspace/ops-api-client"
import type { OpsPermission } from "@workspace/ops-contracts"

export function useOpsClient(): OpsClient {
  const { getToken } = useAuth()

  return useMemo(
    () =>
      createOpsClient({
        baseUrl: getApiBaseUrl(),
        getToken: async () => getToken(),
      }),
    [getToken],
  )
}

export function resolveOpsResource(client: OpsClient, apiPath: string) {
  switch (apiPath) {
    case "/v1/leads":
      return client.leads
    case "/v1/fleet":
      return client.fleet
    case "/v1/drivers":
      return client.drivers
    case "/v1/waitlist":
      return client.waitlist
    case "/v1/media-kit":
      return client.mediaKit
    default:
      throw new Error(`Unknown ops API path: ${apiPath}`)
  }
}

export function apiPathToPermission(apiPath: string): OpsPermission {
  switch (apiPath) {
    case "/v1/leads":
      return "leads"
    case "/v1/fleet":
      return "fleet"
    case "/v1/drivers":
      return "drivers"
    case "/v1/waitlist":
      return "waitlist"
    case "/v1/media-kit":
      return "media_kit"
    default:
      throw new Error(`Unknown ops API path: ${apiPath}`)
  }
}

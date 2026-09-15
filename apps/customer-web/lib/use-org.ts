"use client"

import { useAuth } from "@clerk/nextjs"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { type AdvertiserOrgDto, type AdvertiserPermission, orgCan } from "@workspace/ops-contracts"

import { getOrg } from "@/lib/org-client"

export const ORG_QUERY_KEY = ["customer-org"] as const

/**
 * The caller's org plus their effective permissions. Every surface that hides
 * an action reads from here, so a role change only has to invalidate one key.
 *
 * Server checks stay authoritative — this exists so a Member isn't shown a
 * Submit button that will 403 after they've filled in a whole campaign.
 */
export function useOrg() {
  const { getToken, isLoaded } = useAuth()

  return useQuery<AdvertiserOrgDto>({
    queryKey: ORG_QUERY_KEY,
    queryFn: () => getOrg(getToken),
    enabled: isLoaded,
    // Permissions are cached 60s server-side; matching that here keeps a
    // demoted user from acting on a stale UI much past the API's own window.
    staleTime: 60_000,
  })
}

export function useOrgPermissions(): {
  org: AdvertiserOrgDto | undefined
  isLoading: boolean
  can: (permission: AdvertiserPermission) => boolean
  isOwner: boolean
} {
  const { data, isLoading } = useOrg()
  return {
    org: data,
    isLoading,
    can: (permission) => orgCan(data, permission),
    isOwner: data?.isOwner ?? false,
  }
}

/** Call after any role/membership mutation so hidden actions re-evaluate. */
export function useInvalidateOrg() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY })
}

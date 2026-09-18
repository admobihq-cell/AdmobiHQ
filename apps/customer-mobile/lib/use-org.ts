import { useQuery } from "@tanstack/react-query"

import { type AdvertiserOrgDto, type AdvertiserPermission, orgCan } from "@workspace/ops-contracts"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { getOrg } from "@/lib/org-client"

export const ORG_QUERY_KEY = ["customer-org"] as const

/** Expo twin of customer-web's lib/use-org.ts — see that file for the rationale. */
export function useOrg() {
  const getToken = useTokenGetter()
  return useQuery<AdvertiserOrgDto>({
    queryKey: ORG_QUERY_KEY,
    queryFn: () => getOrg(getToken),
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

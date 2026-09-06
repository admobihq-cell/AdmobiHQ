import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CampaignCreateInput,
  CampaignDto,
  CampaignUpdateInput,
} from "@workspace/ops-contracts"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import {
  createCampaign,
  deleteCampaign,
  deleteCreative,
  getCampaign,
  listCampaigns,
  submitCampaign,
  updateCampaign,
  uploadCreative,
  type CampaignApiError,
  type PickedCreative,
} from "@/lib/campaigns-client"

/**
 * Single source of truth for the campaign list, the detail screen, and the
 * calendar — mirrors apps/customer-web/lib/use-campaigns.ts against the same
 * endpoints. Mutations invalidate list and detail together, so a reschedule
 * shows up on the list without a manual refetch.
 *
 * Unlike the web hooks, nothing here raises a toast: this app has no toast
 * library and isn't getting one. Callers render `mutation.error` through
 * ApiErrorBanner instead, which is why formatCampaignError lives here rather
 * than in each screen.
 */

const LIST_KEY = ["customer-campaigns"] as const
const detailKey = (id: number) => ["customer-campaign", id] as const

/** The submit route answers 400 with `issues.missingFields` /
 * `issues.missingCreatives`. Naming what's still missing is the whole value of
 * that response, so don't flatten it to "incomplete". */
export function formatCampaignError(error: unknown): string {
  if (!error) return ""
  const issues = (error as CampaignApiError).issues as
    | { missingFields?: string[]; missingCreatives?: string[] }
    | undefined
  const missing = [
    ...(issues?.missingFields ?? []).map((field) => field.replace(/_/g, " ")),
    ...(issues?.missingCreatives ?? []).map((panel) => `creative for ${panel}`),
  ]
  if (missing.length > 0) return `Still needed: ${missing.join(", ")}`
  return error instanceof Error ? error.message : "Something went wrong"
}

export function useCampaigns() {
  const getToken = useTokenGetter()
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => listCampaigns(getToken),
  })
}

export function useCampaign(id: number | null) {
  const getToken = useTokenGetter()
  return useQuery({
    queryKey: detailKey(id ?? 0),
    queryFn: () => getCampaign(getToken, id!),
    enabled: id != null,
  })
}

/** Anything that changes a campaign can change where it sits in a filter or on
 * the calendar, so list and detail always invalidate together. */
function useInvalidate() {
  const queryClient = useQueryClient()
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: LIST_KEY })
    if (id != null) void queryClient.invalidateQueries({ queryKey: detailKey(id) })
  }
}

export function useCreateCampaign() {
  const getToken = useTokenGetter()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: CampaignCreateInput) => createCampaign(getToken, data),
    onSuccess: (campaign) => invalidate(campaign.id),
  })
}

export function useUpdateCampaign() {
  const getToken = useTokenGetter()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CampaignUpdateInput }) =>
      updateCampaign(getToken, id, data),
    onSuccess: (campaign) => invalidate(campaign.id),
  })
}

export function useDeleteCampaign() {
  const getToken = useTokenGetter()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => deleteCampaign(getToken, id),
    onSuccess: () => invalidate(),
  })
}

export function useSubmitCampaign() {
  const getToken = useTokenGetter()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => submitCampaign(getToken, id),
    onSuccess: (campaign) => invalidate(campaign.id),
  })
}

export function useUploadCreative(campaignId: number) {
  const getToken = useTokenGetter()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (file: PickedCreative) => uploadCreative(getToken, campaignId, file),
    onSuccess: () => invalidate(campaignId),
  })
}

export function useDeleteCreative(campaignId: number) {
  const getToken = useTokenGetter()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (creativeId: number) => deleteCreative(getToken, campaignId, creativeId),
    onSuccess: () => invalidate(campaignId),
  })
}

export type { CampaignDto }

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { CampaignCreateInput, CampaignDto, CampaignUpdateInput } from "@workspace/ops-contracts"

import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import {
  createCampaign,
  deleteCampaign,
  deleteCreative,
  getCampaign,
  listCampaigns,
  submitCampaign,
  updateCampaign,
  uploadCreative,
} from "@/lib/campaigns-client"

/**
 * Single source of truth for the campaign list, the detail page, and the
 * calendar. Mutations invalidate both keys, so a reschedule dragged on the
 * calendar shows up on the list without a reload.
 *
 * Error toasts live here rather than in each caller: every campaign mutation
 * wants the same "tell the user it failed" behaviour, and centralizing it
 * means a new call site can't forget.
 */

const LIST_KEY = ["customer-campaigns"] as const
const detailKey = (id: number) => ["customer-campaign", id] as const

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong"
}

export function useCampaigns() {
  const { getToken } = useAuthIfEnabled()
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => listCampaigns(getToken),
  })
}

export function useCampaign(id: number | null) {
  const { getToken } = useAuthIfEnabled()
  return useQuery({
    queryKey: detailKey(id ?? 0),
    queryFn: () => getCampaign(getToken, id!),
    enabled: id != null,
  })
}

/** Invalidate list + detail together. Anything that changes a campaign can
 * change where it sits in a filter or on the calendar. */
function useInvalidate() {
  const queryClient = useQueryClient()
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: LIST_KEY })
    if (id != null) void queryClient.invalidateQueries({ queryKey: detailKey(id) })
  }
}

export function useCreateCampaign() {
  const { getToken } = useAuthIfEnabled()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: CampaignCreateInput) => createCampaign(getToken, data),
    onSuccess: (campaign) => invalidate(campaign.id),
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useUpdateCampaign() {
  const { getToken } = useAuthIfEnabled()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CampaignUpdateInput }) =>
      updateCampaign(getToken, id, data),
    onSuccess: (campaign) => invalidate(campaign.id),
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useDeleteCampaign() {
  const { getToken } = useAuthIfEnabled()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => deleteCampaign(getToken, id),
    onSuccess: () => {
      invalidate()
      toast.success("Campaign deleted")
    },
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useSubmitCampaign() {
  const { getToken } = useAuthIfEnabled()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => submitCampaign(getToken, id),
    onSuccess: (campaign) => {
      invalidate(campaign.id)
      toast.success("Submitted for review")
    },
    onError: (error) => {
      // The submit route returns { missingFields, missingCreatives } under
      // `issues`; name what's missing instead of a bare "incomplete".
      const issues = (error as { issues?: { missingFields?: string[]; missingCreatives?: string[] } })
        .issues
      const missing = [
        ...(issues?.missingFields ?? []).map((f) => f.replace(/_/g, " ")),
        ...(issues?.missingCreatives ?? []).map((panel) => `creative for ${panel}`),
      ]
      toast.error(missing.length > 0 ? `Still needed: ${missing.join(", ")}` : messageOf(error))
    },
  })
}

export function useUploadCreative(campaignId: number) {
  const { getToken } = useAuthIfEnabled()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (file: File) => uploadCreative(getToken, campaignId, file),
    onSuccess: (creative) => {
      invalidate(campaignId)
      // A warning means the file saved but may look soft on the panel — say
      // so without implying failure.
      if (creative.warning) toast.warning(creative.warning)
    },
    onError: (error) => toast.error(messageOf(error)),
  })
}

export function useDeleteCreative(campaignId: number) {
  const { getToken } = useAuthIfEnabled()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (creativeId: number) => deleteCreative(getToken, campaignId, creativeId),
    onSuccess: () => invalidate(campaignId),
    onError: (error) => toast.error(messageOf(error)),
  })
}

export type { CampaignDto }

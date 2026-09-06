import type {
  CampaignCreativeDto,
  CampaignCreateInput,
  CampaignDto,
  CampaignUpdateInput,
} from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"

export type GetToken = () => Promise<string | null>

/** A creative POST returns the row plus an advisory note when the artwork is
 * the right shape but below the panel canvas. Not an error — the upload
 * succeeded. */
export type UploadedCreative = CampaignCreativeDto & { warning: string | null }

/**
 * No AbortSignal.timeout here, unlike lib/announcements-client.ts: that file's
 * 4-second budget is right for a small JSON poll and fatal for a 50MB creative
 * over Kenyan mobile data. Uploads finish or the user cancels.
 */
async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${apiPublicUrl()}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; issues?: unknown }
      | null
    const error = new Error(body?.error ?? `Request failed (${res.status})`) as Error & {
      issues?: unknown
      status?: number
    }
    error.issues = body?.issues
    error.status = res.status
    throw error
  }
  return res
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
}

export async function listCampaigns(getToken: GetToken): Promise<CampaignDto[]> {
  const res = await authedFetch(getToken, "/v1/customer/campaigns")
  return res.json()
}

export async function getCampaign(getToken: GetToken, id: number): Promise<CampaignDto> {
  const res = await authedFetch(getToken, `/v1/customer/campaigns/${id}`)
  return res.json()
}

export async function createCampaign(
  getToken: GetToken,
  data: CampaignCreateInput,
): Promise<CampaignDto> {
  const res = await authedFetch(getToken, "/v1/customer/campaigns", jsonInit("POST", data))
  return res.json()
}

export async function updateCampaign(
  getToken: GetToken,
  id: number,
  data: CampaignUpdateInput,
): Promise<CampaignDto> {
  const res = await authedFetch(
    getToken,
    `/v1/customer/campaigns/${id}`,
    jsonInit("PATCH", data),
  )
  return res.json()
}

export async function deleteCampaign(getToken: GetToken, id: number): Promise<void> {
  await authedFetch(getToken, `/v1/customer/campaigns/${id}`, { method: "DELETE" })
}

export async function submitCampaign(getToken: GetToken, id: number): Promise<CampaignDto> {
  const res = await authedFetch(getToken, `/v1/customer/campaigns/${id}/submit`, {
    method: "POST",
  })
  return res.json()
}

export async function uploadCreative(
  getToken: GetToken,
  campaignId: number,
  file: File,
  slot = "all",
): Promise<UploadedCreative> {
  const form = new FormData()
  form.append("file", file)
  form.append("slot", slot)
  // Content-Type is deliberately unset: the browser must add the multipart
  // boundary, and setting it by hand produces a body the server can't parse.
  const res = await authedFetch(getToken, `/v1/customer/campaigns/${campaignId}/creatives`, {
    method: "POST",
    body: form,
  })
  return res.json()
}

export async function deleteCreative(
  getToken: GetToken,
  campaignId: number,
  creativeId: number,
): Promise<void> {
  await authedFetch(
    getToken,
    `/v1/customer/campaigns/${campaignId}/creatives/${creativeId}`,
    { method: "DELETE" },
  )
}

/** Authenticated proxy URL for a creative's bytes. Fetch it with the bearer
 * token and turn the Blob into an object URL — never point an <img src> at
 * Cloudinary, which this URL deliberately is not. */
export function creativeFileUrl(campaignId: number, creativeId: number): string {
  return `${apiPublicUrl()}/v1/customer/campaigns/${campaignId}/creatives/${creativeId}/file`
}

export async function fetchCreativeBlob(
  getToken: GetToken,
  campaignId: number,
  creativeId: number,
): Promise<Blob> {
  const res = await authedFetch(getToken, `/v1/customer/campaigns/${campaignId}/creatives/${creativeId}/file`)
  return res.blob()
}

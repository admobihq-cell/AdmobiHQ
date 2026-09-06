import type {
  CampaignCreateInput,
  CampaignCreativeDto,
  CampaignDto,
  CampaignUpdateInput,
} from "@workspace/ops-contracts"

import { EXPO_PUBLIC_API_URL } from "@/lib/env"

const API_URL = EXPO_PUBLIC_API_URL ?? "http://localhost:3003"

export type GetToken = () => Promise<string | null>

/** A creative POST returns the row plus an advisory note when the artwork is
 * the right shape but below the panel canvas. Not an error — the upload
 * succeeded. */
export type UploadedCreative = CampaignCreativeDto & { warning: string | null }

/** The picked file, narrowed to the fields the upload needs. Mirrors the part
 * of expo-image-picker's ImagePickerAsset we actually send. */
export type PickedCreative = {
  uri: string
  name: string
  mimeType: string
}

export type CampaignApiError = Error & { issues?: unknown; status?: number }

/**
 * Deliberately not built on lib/api-client.ts: that module throws
 * `Request to /path failed with status 400`, which discards the server's
 * message. Campaign routes answer with a real explanation ("A reason is
 * required", or `issues.missingFields` naming what a submit still needs), and
 * those strings are what the UI shows the advertiser.
 *
 * No AbortSignal.timeout either, unlike lib/announcements-client.ts: that
 * file's budget is right for a small JSON poll and fatal for a 50MB creative
 * over Kenyan mobile data. Uploads finish or the user cancels.
 */
async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; issues?: unknown }
      | null
    const error = new Error(
      body?.error ?? `Request failed (${res.status})`,
    ) as CampaignApiError
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
  const res = await authedFetch(getToken, `/v1/customer/campaigns/${id}`, jsonInit("PATCH", data))
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

/**
 * React Native's FormData takes `{ uri, name, type }` in place of a File —
 * the native layer streams the file off disk from the uri, so a 50MB video
 * never has to sit in JS memory. Content-Type is left unset on purpose: the
 * runtime adds the multipart boundary, and setting it by hand produces a body
 * the server can't parse.
 */
export async function uploadCreative(
  getToken: GetToken,
  campaignId: number,
  file: PickedCreative,
  slot = "all",
): Promise<UploadedCreative> {
  const form = new FormData()
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob)
  form.append("slot", slot)

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

/**
 * Authenticated proxy URL for a creative's bytes — never a Cloudinary URL,
 * which this deliberately is not. React Native's <Image source> accepts
 * `headers`, so a thumbnail can carry the bearer token without downloading
 * the blob by hand.
 */
export function creativeFileUrl(campaignId: number, creativeId: number): string {
  return `${API_URL}/v1/customer/campaigns/${campaignId}/creatives/${creativeId}/file`
}

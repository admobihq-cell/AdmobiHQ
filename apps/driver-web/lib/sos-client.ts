import type {
  SafetyIncidentDetailDto,
  SafetyIncidentDto,
  SafetyIncidentPhotoDto,
  SafetyIncidentUpdateDto,
} from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"
import type { GetToken } from "@/lib/driver-profile-client"

/**
 * SOS API client.
 *
 * Unlike lib/support-client.ts there is no localStorage token juggling: an SOS
 * is only ever filed by a signed-in driver, so every call carries the driver's
 * Clerk token and the server resolves ownership from it.
 */

export type Incident = SafetyIncidentDto
export type IncidentDetail = SafetyIncidentDetailDto
export type IncidentUpdate = SafetyIncidentUpdateDto
export type IncidentPhoto = SafetyIncidentPhotoDto

async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  // FormData must set its own multipart boundary — only force JSON for
  // string bodies.
  if (typeof init?.body === "string") headers.set("Content-Type", "application/json")

  const res = await fetch(`${apiPublicUrl()}${path}`, {
    ...init,
    headers,
    // Longer than the 4s used for notifications: this is an emergency report
    // that may be filed on a bad roadside connection, and giving up early
    // would lose it.
    signal: init?.signal ?? AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res
}

export async function createIncident(
  getToken: GetToken,
  input: {
    type: string
    description?: string
    reported_lat?: number
    reported_lng?: number
    reported_accuracy_m?: number
  },
): Promise<Incident> {
  const res = await authedFetch(getToken, "/v1/driver/sos", {
    method: "POST",
    body: JSON.stringify({ ...input, channel: "driver-web" }),
  })
  const json = (await res.json()) as { success: true; data: IncidentDetail }
  return json.data
}

export async function listMyIncidents(getToken: GetToken): Promise<Incident[]> {
  const res = await authedFetch(getToken, "/v1/driver/sos")
  const json = (await res.json()) as { items: Incident[] }
  return json.items
}

export async function getIncident(getToken: GetToken, id: number): Promise<IncidentDetail> {
  const res = await authedFetch(getToken, `/v1/driver/sos/${id}`)
  return (await res.json()) as IncidentDetail
}

export async function replyToIncident(
  getToken: GetToken,
  id: number,
  body: string,
): Promise<IncidentUpdate> {
  const res = await authedFetch(getToken, `/v1/driver/sos/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
  return (await res.json()) as IncidentUpdate
}

export async function cancelIncident(
  getToken: GetToken,
  id: number,
): Promise<IncidentDetail> {
  const res = await authedFetch(getToken, `/v1/driver/sos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled" }),
  })
  return (await res.json()) as IncidentDetail
}

export async function uploadIncidentPhoto(
  getToken: GetToken,
  id: number,
  file: File,
): Promise<IncidentPhoto> {
  const form = new FormData()
  form.append("file", file)
  const res = await authedFetch(getToken, `/v1/driver/sos/${id}/photos`, {
    method: "POST",
    body: form,
  })
  return (await res.json()) as IncidentPhoto
}

export async function pingIncidentLocation(
  getToken: GetToken,
  id: number,
  lat: number,
  lng: number,
): Promise<void> {
  await authedFetch(getToken, `/v1/driver/sos/${id}/location`, {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  })
}

/**
 * Never rejects and never blocks longer than 8s. Permission denied, no
 * geolocation API, or a timeout all resolve to `{}` and the report is filed
 * without coordinates — losing the incident because we could not get a fix
 * would be the worst possible failure in this flow.
 */
export function captureLocation(): Promise<{
  reported_lat?: number
  reported_lng?: number
  reported_accuracy_m?: number
}> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({})
      return
    }

    let settled = false
    const finish = (value: Parameters<typeof resolve>[0]) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const timer = setTimeout(() => finish({}), 8_000)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer)
        finish({
          reported_lat: position.coords.latitude,
          reported_lng: position.coords.longitude,
          reported_accuracy_m: position.coords.accuracy
            ? Math.round(position.coords.accuracy)
            : undefined,
        })
      },
      () => {
        clearTimeout(timer)
        finish({})
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 30_000 },
    )
  })
}

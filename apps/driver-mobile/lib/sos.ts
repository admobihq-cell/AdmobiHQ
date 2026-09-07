import * as Location from "expo-location"

import type {
  SafetyIncidentDetailDto,
  SafetyIncidentDto,
  SafetyIncidentPhotoDto,
  SafetyIncidentUpdateDto,
} from "@workspace/ops-contracts"

import { EXPO_PUBLIC_API_URL } from "@/lib/env"

const API_URL = EXPO_PUBLIC_API_URL ?? "http://localhost:3003"

/**
 * SOS API client.
 *
 * Unlike lib/support.ts there is no AsyncStorage token juggling: an SOS is
 * only ever filed by a signed-in driver, so every call carries the driver's
 * Clerk token and the server resolves ownership from it.
 */

export type Incident = SafetyIncidentDto
export type IncidentDetail = SafetyIncidentDetailDto
export type IncidentUpdate = SafetyIncidentUpdateDto
export type IncidentPhoto = SafetyIncidentPhotoDto

/** A photo chosen on the submit screen and not yet uploaded. */
export type PendingPhoto = {
  uri: string
  mimeType: string
  fileName: string
}

async function req<T>(
  path: string,
  token: string,
  init?: RequestInit & { skipJson?: boolean },
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`)
  }
  if (init?.skipJson || res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function createIncident(
  token: string,
  input: {
    type: string
    description?: string
    reported_lat?: number
    reported_lng?: number
    reported_accuracy_m?: number
  },
): Promise<Incident> {
  const res = await req<{ success: true; data: IncidentDetail }>("/v1/driver/sos", token, {
    method: "POST",
    body: JSON.stringify({ ...input, channel: "driver-mobile" }),
  })
  return res.data
}

export function listMyIncidents(token: string): Promise<{ items: Incident[] }> {
  return req<{ items: Incident[] }>("/v1/driver/sos", token)
}

export function getIncident(token: string, id: number): Promise<IncidentDetail> {
  return req<IncidentDetail>(`/v1/driver/sos/${id}`, token)
}

export function replyToIncident(
  token: string,
  id: number,
  body: string,
): Promise<IncidentUpdate> {
  return req<IncidentUpdate>(`/v1/driver/sos/${id}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
}

export function cancelIncident(token: string, id: number): Promise<IncidentDetail> {
  return req<IncidentDetail>(`/v1/driver/sos/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled" }),
  })
}

/**
 * React Native multipart: the file part is `{ uri, name, type }`, NOT a web
 * File. Do not set Content-Type — the runtime must fill in the multipart
 * boundary itself.
 */
export function uploadIncidentPhoto(
  token: string,
  id: number,
  photo: PendingPhoto,
): Promise<IncidentPhoto> {
  const form = new FormData()
  form.append("file", {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob)

  return req<IncidentPhoto>(`/v1/driver/sos/${id}/photos`, token, {
    method: "POST",
    body: form,
  })
}

export function pingIncidentLocation(
  token: string,
  id: number,
  lat: number,
  lng: number,
): Promise<void> {
  return req<void>(`/v1/driver/sos/${id}/location`, token, {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
    skipJson: true,
  })
}

/**
 * Never throws and never blocks longer than 8s. A driver in a tunnel, with
 * location off, or who denies the prompt still gets their report filed —
 * losing the incident because we could not get a fix would be the worst
 * possible failure in this flow.
 */
export async function captureLocation(): Promise<{
  reported_lat?: number
  reported_lng?: number
  reported_accuracy_m?: number
}> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") return {}

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
    ])
    if (!position) return {}

    return {
      reported_lat: position.coords.latitude,
      reported_lng: position.coords.longitude,
      reported_accuracy_m: position.coords.accuracy
        ? Math.round(position.coords.accuracy)
        : undefined,
    }
  } catch {
    return {}
  }
}

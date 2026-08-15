import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@clerk/clerk-expo"
import type {
  DriverDocumentDto,
  DriverDocumentType,
  DriverProfileDto,
  DriverProfileUpdateInput,
} from "@workspace/ops-contracts"

import { EXPO_PUBLIC_API_URL } from "@/lib/env"

const API_URL = EXPO_PUBLIC_API_URL ?? "http://localhost:3003"

type GetToken = () => Promise<string | null>

async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res
}

export async function fetchDriverProfile(getToken: GetToken): Promise<DriverProfileDto> {
  const res = await authedFetch(getToken, "/v1/driver/profile")
  return res.json()
}

export async function patchDriverProfile(
  getToken: GetToken,
  data: DriverProfileUpdateInput,
): Promise<DriverProfileDto> {
  const res = await authedFetch(getToken, "/v1/driver/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function submitDriverProfile(getToken: GetToken): Promise<DriverProfileDto> {
  const res = await authedFetch(getToken, "/v1/driver/profile/submit", { method: "POST" })
  return res.json()
}

/** RN's FormData accepts { uri, name, type } file parts directly — not a
 * real Blob, which is why this takes that shape rather than a File/Blob
 * (see packages/ops-api-client's notifications.uploadImage for the same
 * cross-platform pattern). */
export async function uploadDriverDocument(
  getToken: GetToken,
  type: DriverDocumentType,
  file: { uri: string; name: string; type: string },
): Promise<DriverDocumentDto> {
  const form = new FormData()
  form.append("file", file as unknown as Blob)
  form.append("type", type)
  const res = await authedFetch(getToken, "/v1/driver/documents", {
    method: "POST",
    body: form,
  })
  return res.json()
}

export function driverDocumentFileUrl(id: number): string {
  return `${API_URL}/v1/driver/documents/${id}/file`
}

export function useDriverProfile() {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<DriverProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refetch = useCallback(async () => {
    setError(false)
    try {
      const result = await fetchDriverProfile(getToken)
      setProfile(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { profile, loading, error, refetch, getToken }
}

/** Which profile-setup route a driver should land on next, given their
 * current profile — mirrors the required-field checks in
 * apps/api/lib/driver-profile-dto.ts's missingProfileFields/Documents.
 * Three steps: profile (personal info + ID + photo), tax & payout, review. */
export function nextProfileSetupStep(profile: DriverProfileDto): string {
  const hasPersonalInfo =
    profile.full_name && profile.phone && profile.city && profile.national_id_number
  const hasPhoto = profile.documents.some((d) => d.type === "profile_photo")
  const hasNationalId = profile.documents.some((d) => d.type === "national_id")

  if (!hasPersonalInfo || !hasNationalId || !hasPhoto) {
    return "/profile-setup/profile"
  }
  if (!profile.kra_pin || !profile.payout_method) return "/profile-setup/tax-payout"
  return "/profile-setup/review"
}

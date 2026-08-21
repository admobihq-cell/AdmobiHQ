import type {
  DriverDocumentDto,
  DriverDocumentType,
  DriverProfileDto,
  DriverProfileUpdateInput,
} from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"

export type GetToken = () => Promise<string | null>

async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${apiPublicUrl()}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res
}

export async function fetchDriverProfileClient(getToken: GetToken): Promise<DriverProfileDto> {
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

export async function uploadDriverDocument(
  getToken: GetToken,
  type: DriverDocumentType,
  file: File,
): Promise<DriverDocumentDto> {
  const form = new FormData()
  form.set("file", file)
  form.set("type", type)
  const res = await authedFetch(getToken, "/v1/driver/documents", {
    method: "POST",
    body: form,
  })
  return res.json()
}

export async function deleteDriverDocument(getToken: GetToken, id: number): Promise<void> {
  await authedFetch(getToken, `/v1/driver/documents/${id}`, { method: "DELETE" })
}

/** Fetches a document's bytes through the authenticated proxy — never a raw
 * Cloudinary/Blob URL, since the file route requires a bearer header a plain
 * <img src> can't send. Returns the Blob itself rather than an object URL:
 * object URLs must not be cached (they're revoked on unmount, and a cached
 * revoked URL would silently serve a broken image to another consumer of
 * the same query key), so callers derive their own revocable URL from this
 * cacheable Blob via `URL.createObjectURL`. */
export async function fetchDriverDocumentBlob(getToken: GetToken, id: number): Promise<Blob> {
  const res = await authedFetch(getToken, `/v1/driver/documents/${id}/file`, {
    // A read-only preview fetch should never hang indefinitely — bound it
    // so a stalled request surfaces as a retryable error instead of an
    // infinite skeleton.
    signal: AbortSignal.timeout(15000),
  })
  return res.blob()
}

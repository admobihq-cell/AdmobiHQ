import { useAuth } from "@clerk/nextjs"

import { apiPublicUrl } from "@/lib/site-urls"

export type CustomerAnnouncementDto = {
  id: number
  title: string
  body: string
  image_url: string | null
  category: string
  read_at: string | null
  created_at: string
}

export type CustomerAnnouncementPage = {
  items: CustomerAnnouncementDto[]
  next_cursor: number | null
}

type GetToken = ReturnType<typeof useAuth>["getToken"]

async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init?.body) headers.set("Content-Type", "application/json")

  const res = await fetch(`${apiPublicUrl()}${path}`, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(4000),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res
}

export async function fetchCustomerAnnouncements(
  getToken: GetToken,
  options: { cursor?: number | null; limit?: number } = {},
): Promise<CustomerAnnouncementPage> {
  const params = new URLSearchParams()
  if (options.cursor) params.set("cursor", String(options.cursor))
  if (options.limit) params.set("limit", String(options.limit))
  const qs = params.toString()
  const res = await authedFetch(
    getToken,
    `/v1/customer/announcements${qs ? `?${qs}` : ""}`,
  )
  return res.json()
}

export async function markCustomerAnnouncementsRead(
  getToken: GetToken,
): Promise<void> {
  await authedFetch(getToken, "/v1/customer/announcements/read", {
    method: "PATCH",
  })
}

export async function setCustomerAnnouncementRead(
  getToken: GetToken,
  id: number,
  read: boolean,
): Promise<void> {
  await authedFetch(getToken, `/v1/customer/announcements/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ read }),
  })
}

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

type GetToken = ReturnType<typeof useAuth>["getToken"]

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

export async function fetchCustomerAnnouncements(
  getToken: GetToken,
): Promise<CustomerAnnouncementDto[]> {
  const res = await authedFetch(getToken, "/v1/customer/announcements")
  return res.json()
}

export async function markCustomerAnnouncementsRead(getToken: GetToken): Promise<void> {
  await authedFetch(getToken, "/v1/customer/announcements/read", { method: "PATCH" })
}

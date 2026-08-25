import type { DriverNotificationDto } from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"
import type { GetToken } from "@/lib/driver-profile-client"

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

export async function fetchDriverNotifications(
  getToken: GetToken,
): Promise<DriverNotificationDto[]> {
  const res = await authedFetch(getToken, "/v1/driver/notifications")
  return res.json()
}

export async function markDriverNotificationsRead(getToken: GetToken): Promise<void> {
  await authedFetch(getToken, "/v1/driver/notifications/read", { method: "PATCH" })
}

export type DriverAnnouncementDto = {
  id: number
  title: string
  body: string
  image_url: string | null
  category: string
  read_at: string | null
  created_at: string
}

export async function fetchDriverAnnouncements(
  getToken: GetToken,
): Promise<DriverAnnouncementDto[]> {
  const res = await authedFetch(getToken, "/v1/driver/announcements")
  return res.json()
}

export async function markDriverAnnouncementsRead(getToken: GetToken): Promise<void> {
  await authedFetch(getToken, "/v1/driver/announcements/read", { method: "PATCH" })
}

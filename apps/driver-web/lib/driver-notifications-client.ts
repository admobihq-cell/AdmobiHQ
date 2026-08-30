import type { DriverNotificationDto } from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"
import type { GetToken } from "@/lib/driver-profile-client"

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

function pageQuery(options: { cursor?: number | null; limit?: number }) {
  const params = new URLSearchParams()
  if (options.cursor) params.set("cursor", String(options.cursor))
  if (options.limit) params.set("limit", String(options.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

type WithReadAt = { read_at: string | null }

export type DriverNotificationPage = {
  items: DriverNotificationDto[]
  next_cursor: number | null
  unread_count: number
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

export type DriverAnnouncementPage = {
  items: DriverAnnouncementDto[]
  next_cursor: number | null
  unread_count: number
}

/** Tolerates both the paginated `{ items, next_cursor, unread_count }` shape and
 * the older bare-array response, so web and API can roll out in either order. */
function normalizePage<T extends WithReadAt>(
  raw: unknown,
): { items: T[]; next_cursor: number | null; unread_count: number } {
  const countUnread = (items: T[]) =>
    items.filter((item) => !item.read_at).length
  if (Array.isArray(raw)) {
    const items = raw as T[]
    return { items, next_cursor: null, unread_count: countUnread(items) }
  }
  const page = raw as {
    items?: T[]
    next_cursor?: number | null
    unread_count?: number
  } | null
  const items = page?.items ?? []
  return {
    items,
    next_cursor: page?.next_cursor ?? null,
    unread_count: page?.unread_count ?? countUnread(items),
  }
}

export async function fetchDriverNotifications(
  getToken: GetToken,
  options: { cursor?: number | null; limit?: number } = {},
): Promise<DriverNotificationPage> {
  const res = await authedFetch(
    getToken,
    `/v1/driver/notifications${pageQuery(options)}`,
  )
  return normalizePage<DriverNotificationDto>(await res.json())
}

export async function markDriverNotificationsRead(
  getToken: GetToken,
): Promise<void> {
  await authedFetch(getToken, "/v1/driver/notifications/read", {
    method: "PATCH",
  })
}

export async function setDriverNotificationRead(
  getToken: GetToken,
  id: number,
  read: boolean,
): Promise<void> {
  await authedFetch(getToken, `/v1/driver/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ read }),
  })
}

export async function fetchDriverAnnouncements(
  getToken: GetToken,
  options: { cursor?: number | null; limit?: number } = {},
): Promise<DriverAnnouncementPage> {
  const res = await authedFetch(
    getToken,
    `/v1/driver/announcements${pageQuery(options)}`,
  )
  return normalizePage<DriverAnnouncementDto>(await res.json())
}

export async function markDriverAnnouncementsRead(
  getToken: GetToken,
): Promise<void> {
  await authedFetch(getToken, "/v1/driver/announcements/read", {
    method: "PATCH",
  })
}

export async function setDriverAnnouncementRead(
  getToken: GetToken,
  id: number,
  read: boolean,
): Promise<void> {
  await authedFetch(getToken, `/v1/driver/announcements/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ read }),
  })
}

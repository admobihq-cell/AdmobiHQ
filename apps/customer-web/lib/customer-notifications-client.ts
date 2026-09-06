import type { CustomerNotificationDto } from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"
import type { GetToken } from "@/lib/campaigns-client"

/** Campaign lifecycle notifications. The announcement feed lives in
 * lib/announcements-client.ts; the two are merged into one inbox client-side
 * by lib/use-customer-notifications.ts, mirroring the driver apps. */

async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init?.body) headers.set("Content-Type", "application/json")

  const res = await fetch(`${apiPublicUrl()}${path}`, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(8000),
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

export type CustomerNotificationPage = {
  items: CustomerNotificationDto[]
  next_cursor: number | null
  unread_count: number
}

/** Tolerates both the paginated shape and a bare array, so web and API can
 * roll out in either order. */
function normalizePage(raw: unknown): CustomerNotificationPage {
  const countUnread = (items: CustomerNotificationDto[]) =>
    items.filter((item) => !item.read_at).length
  if (Array.isArray(raw)) {
    const items = raw as CustomerNotificationDto[]
    return { items, next_cursor: null, unread_count: countUnread(items) }
  }
  const page = raw as Partial<CustomerNotificationPage> | null
  const items = page?.items ?? []
  return {
    items,
    next_cursor: page?.next_cursor ?? null,
    unread_count: page?.unread_count ?? countUnread(items),
  }
}

export async function fetchCustomerNotifications(
  getToken: GetToken,
  options: { cursor?: number | null; limit?: number } = {},
): Promise<CustomerNotificationPage> {
  const res = await authedFetch(getToken, `/v1/customer/notifications${pageQuery(options)}`)
  return normalizePage(await res.json())
}

export async function markCustomerNotificationsRead(getToken: GetToken): Promise<void> {
  await authedFetch(getToken, "/v1/customer/notifications/read", { method: "PATCH" })
}

export async function setCustomerNotificationRead(
  getToken: GetToken,
  id: number,
  read: boolean,
): Promise<void> {
  await authedFetch(getToken, `/v1/customer/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ read }),
  })
}

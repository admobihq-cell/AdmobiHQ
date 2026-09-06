import type { CustomerNotificationDto } from "@workspace/ops-contracts"

import { getJson, patchJson } from "@/lib/api-client"

/** Campaign lifecycle notifications. The announcement feed lives in
 * lib/announcements-client.ts; the two are merged into one inbox client-side
 * by lib/use-customer-inbox.ts, mirroring customer-web and the driver apps. */

type GetToken = () => Promise<string | null>

async function authedHeaders(getToken: GetToken): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type CustomerNotificationPage = {
  items?: CustomerNotificationDto[]
}

/** Tolerates both the paginated shape and a bare array, so the app and the API
 * can roll out in either order — the same normalisation customer-web does. */
function normalizeItems(raw: unknown): CustomerNotificationDto[] {
  if (Array.isArray(raw)) return raw as CustomerNotificationDto[]
  return (raw as CustomerNotificationPage | null)?.items ?? []
}

export async function fetchCustomerNotifications(
  getToken: GetToken,
): Promise<CustomerNotificationDto[]> {
  const raw = await getJson<unknown>("/v1/customer/notifications", await authedHeaders(getToken))
  return normalizeItems(raw)
}

export async function markCustomerNotificationsRead(getToken: GetToken): Promise<void> {
  await patchJson<{ success: true }>(
    "/v1/customer/notifications/read",
    {},
    await authedHeaders(getToken),
  )
}

export async function setCustomerNotificationRead(
  getToken: GetToken,
  id: number,
  read: boolean,
): Promise<void> {
  await patchJson<{ success: true }>(
    `/v1/customer/notifications/${id}`,
    { read },
    await authedHeaders(getToken),
  )
}

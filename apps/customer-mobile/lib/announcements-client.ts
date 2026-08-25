import { getJson, patchJson } from "@/lib/api-client"
import type { AnnouncementDeliveryDto } from "@/lib/notifications-data"

type GetToken = () => Promise<string | null>

async function authedHeaders(getToken: GetToken): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchCustomerAnnouncements(
  getToken: GetToken,
): Promise<AnnouncementDeliveryDto[]> {
  return getJson<AnnouncementDeliveryDto[]>(
    "/v1/customer/mobile-announcements",
    await authedHeaders(getToken),
  )
}

// The read route only exports PATCH — patchJson (not postJson) matches it,
// since Next.js route handlers 405 on a method they don't export.
export async function markCustomerAnnouncementsRead(getToken: GetToken): Promise<void> {
  await patchJson<{ success: true }>(
    "/v1/customer/mobile-announcements/read",
    {},
    await authedHeaders(getToken),
  )
}

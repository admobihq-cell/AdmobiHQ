import { getJson, patchJson } from "@/lib/api-client"
import type { AnnouncementDeliveryDto } from "@/lib/notifications-data"

type GetToken = () => Promise<string | null>

async function authedHeaders(getToken: GetToken): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchDriverAnnouncements(
  getToken: GetToken,
): Promise<AnnouncementDeliveryDto[]> {
  return getJson<AnnouncementDeliveryDto[]>(
    "/v1/driver/mobile-announcements",
    await authedHeaders(getToken),
  )
}

// The read route only exports PATCH — patchJson (not postJson) matches it,
// since Next.js route handlers 405 on a method they don't export.
export async function markDriverAnnouncementsRead(getToken: GetToken): Promise<void> {
  await patchJson<{ success: true }>(
    "/v1/driver/mobile-announcements/read",
    {},
    await authedHeaders(getToken),
  )
}

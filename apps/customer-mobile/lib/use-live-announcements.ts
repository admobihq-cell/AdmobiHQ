import { useQuery } from "@tanstack/react-query"

import { getJson } from "@/lib/api-client"
import {
  announcementToNotificationItem,
  type AnnouncementBroadcastDto,
  type NotificationItem,
} from "@/lib/notifications-data"

/** Fetches real ops broadcasts to merge alongside the static notification seed data. */
export function useLiveAnnouncements() {
  const query = useQuery({
    queryKey: ["live-announcements"],
    queryFn: async (): Promise<NotificationItem[]> => {
      const res = await getJson<{ items: AnnouncementBroadcastDto[] }>(
        "/v1/public/announcements",
      )
      return res.items.map(announcementToNotificationItem)
    },
  })

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    refetch: async () => {
      await query.refetch()
    },
  }
}

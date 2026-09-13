import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-expo"

import { fetchCustomerAnnouncements } from "@/lib/announcements-client"
import { announcementDeliveryToNotificationItem, type NotificationItem } from "@/lib/notifications-data"

type LiveAnnouncements = {
  items: NotificationItem[]
  loading: boolean
  refetch: () => Promise<void>
}

/** Fetches this account's own delivered announcements — only what was sent
 * while this account was a resolved recipient, never the full app-wide feed. */
export function useLiveAnnouncements(): LiveAnnouncements {
  const { getToken } = useAuth()

  const query = useQuery({
    queryKey: ["live-announcements"],
    queryFn: async (): Promise<NotificationItem[]> => {
      const items = await fetchCustomerAnnouncements(getToken)
      return items.map(announcementDeliveryToNotificationItem)
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

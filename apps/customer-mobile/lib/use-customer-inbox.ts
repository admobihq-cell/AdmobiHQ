import { useCallback, useMemo } from "react"
import { Platform } from "react-native"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { markCustomerAnnouncementsRead } from "@/lib/announcements-client"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { useTokenGetter } from "@/lib/auth/use-token-getter"
import {
  fetchCustomerNotifications,
  markCustomerNotificationsRead,
  setCustomerNotificationRead,
} from "@/lib/customer-notifications-client"
import {
  customerNotificationToNotificationItem,
  type NotificationItem,
} from "@/lib/notifications-data"
import { useLiveAnnouncements } from "@/lib/use-live-announcements"

export const CAMPAIGN_NOTIFICATIONS_KEY = ["customer-notifications"] as const

/** The web bundle only ever serves the marketing site's app demo, which has no
 * signed-in advertiser to fetch notifications for. */
const CAMPAIGN_FEED_ENABLED = isAuthEnabled() && Platform.OS !== "web"

/**
 * The bell and the notifications screen read from here.
 *
 * Two sources merged on the device — ops announcements and campaign lifecycle
 * events — because they live in different tables with different lifetimes.
 * customer-web and both driver apps do exactly this; this is that pattern in
 * React Native.
 *
 * Read state differs by source and that is a server constraint, not a choice:
 * announcements only expose "mark the whole inbox read", campaign
 * notifications have a per-row endpoint.
 */
export function useCustomerInbox() {
  const getToken = useTokenGetter()
  const queryClient = useQueryClient()
  const announcements = useLiveAnnouncements()

  const campaignsQuery = useQuery({
    queryKey: CAMPAIGN_NOTIFICATIONS_KEY,
    queryFn: async () => {
      const items = await fetchCustomerNotifications(getToken)
      return items.map(customerNotificationToNotificationItem)
    },
    enabled: CAMPAIGN_FEED_ENABLED,
  })

  const items = useMemo<NotificationItem[]>(
    () =>
      [...announcements.items, ...(campaignsQuery.data ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [announcements.items, campaignsQuery.data],
  )

  const refetch = useCallback(async () => {
    await Promise.all([
      announcements.refetch(),
      CAMPAIGN_FEED_ENABLED ? campaignsQuery.refetch() : Promise.resolve(),
    ])
  }, [announcements, campaignsQuery])

  const markRead = useCallback(
    async (item: NotificationItem) => {
      if (item.read) return
      if (item.source === "campaign") {
        await setCustomerNotificationRead(getToken, item.sourceId, true).catch(() => {})
        await queryClient.invalidateQueries({ queryKey: CAMPAIGN_NOTIFICATIONS_KEY })
        return
      }
      // No per-announcement read route exists yet, so opening one announcement
      // clears them all. Long-standing behaviour, called out so it doesn't
      // look like a bug in the merge.
      await markCustomerAnnouncementsRead(getToken).catch(() => {})
      await announcements.refetch()
    },
    [announcements, getToken, queryClient],
  )

  const markAllRead = useCallback(async () => {
    await Promise.all([
      markCustomerAnnouncementsRead(getToken).catch(() => {}),
      CAMPAIGN_FEED_ENABLED
        ? markCustomerNotificationsRead(getToken).catch(() => {})
        : Promise.resolve(),
    ])
    await refetch()
  }, [getToken, refetch])

  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
    loading: announcements.loading || (CAMPAIGN_FEED_ENABLED && campaignsQuery.isPending),
    refetch,
    markRead,
    markAllRead,
  }
}

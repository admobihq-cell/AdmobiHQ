import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-expo"

import { fetchCustomerAnnouncements } from "@/lib/announcements-client"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { announcementDeliveryToNotificationItem, type NotificationItem } from "@/lib/notifications-data"

type LiveAnnouncements = {
  items: NotificationItem[]
  loading: boolean
  refetch: () => Promise<void>
}

/** Fetches this account's own delivered announcements — only what was sent
 * while this account was a resolved recipient, never the full app-wide feed. */
function useLiveAnnouncementsEnabled(): LiveAnnouncements {
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

// useAuth() throws without a mounted ClerkProvider, and app/_layout.tsx's
// AuthenticatedApp only mounts ClerkProvider when isAuthEnabled() is true —
// its disabled branch renders the same children (including this app's tabs,
// where NotificationBellButton lives) with no ClerkProvider ancestor at all.
// So this hook must never call useAuth() when auth is disabled. Same "pick
// the hook implementation once at module load" pattern as
// lib/use-push-registration.ts's useTokenGetter and
// lib/auth/use-customer-session.ts's useSessionImpl.
function useLiveAnnouncementsDisabled(): LiveAnnouncements {
  return {
    items: [],
    loading: false,
    refetch: async () => {},
  }
}

export const useLiveAnnouncements = isAuthEnabled()
  ? useLiveAnnouncementsEnabled
  : useLiveAnnouncementsDisabled

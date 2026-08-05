import { useCallback, useEffect, useState } from "react"

import { DEMO_ANNOUNCEMENTS } from "@/lib/demo/mock-data"
import { announcementToNotificationItem, type NotificationItem } from "@/lib/notifications-data"

/**
 * Web build of useLiveAnnouncements — Metro resolves this over
 * use-live-announcements.ts when bundling for web. The web export only ever
 * serves the marketing-site app demo (see lib/support.web.ts), so this
 * returns static sample content instead of hitting a real backend.
 */
export function useLiveAnnouncements() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setItems(DEMO_ANNOUNCEMENTS.map(announcementToNotificationItem))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { items, loading, refetch }
}

import { useCallback, useEffect, useState } from "react"

import { getJson } from "@/lib/api-client"
import {
  announcementToNotificationItem,
  type AnnouncementBroadcastDto,
  type NotificationItem,
} from "@/lib/notifications-data"

/** Fetches real ops broadcasts to merge alongside the static notification seed data. */
export function useLiveAnnouncements() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await getJson<{ items: AnnouncementBroadcastDto[] }>(
        "/v1/public/announcements",
      )
      setItems(res.items.map(announcementToNotificationItem))
    } catch (error) {
      console.warn("[notifications] failed to load live announcements:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { items, loading, refetch }
}

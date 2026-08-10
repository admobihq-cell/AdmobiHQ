import { useCallback, useEffect, useRef, useState } from "react"

import { getJson } from "@/lib/api-client"
import {
  announcementToNotificationItem,
  type AnnouncementBroadcastDto,
  type NotificationItem,
} from "@/lib/notifications-data"

/** Fetches real ops broadcasts targeted at the driver app to merge alongside the notification feed. */
export function useLiveAnnouncements() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    try {
      const res = await getJson<{ items: AnnouncementBroadcastDto[] }>(
        "/v1/public/announcements?app=driver-mobile",
      )
      if (!mountedRef.current) return
      setItems(res.items.map(announcementToNotificationItem))
    } catch (error) {
      if (!mountedRef.current) return
      console.warn("[notifications] failed to load live announcements:", error)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { items, loading, refetch }
}

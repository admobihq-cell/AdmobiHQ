"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { customerKeysForEvent, customerToastTone, type LiveEvent } from "@workspace/ops-contracts"

import { liveToast } from "@workspace/ui/components/live-toast"
import { useLiveEvents } from "@workspace/ui/lib/live-events"

import { fetchCustomerNotifications } from "@/lib/customer-notifications-client"
import { apiPublicUrl } from "@/lib/site-urls"

/** A burst (bulk review) collapses into one refetch per key and at most this many toasts. */
const COALESCE_MS = 300
const MAX_TOASTS = 3

/**
 * Keeps the advertiser app live: refreshes whatever an event makes stale, and toasts new inbox
 * rows. Toast text comes from the refetched notification row; the event itself is ids only.
 */
export function LiveUpdates() {
  const { getToken, userId } = useAuth()
  const queryClient = useQueryClient()
  const connectedAt = useRef(0)
  const toasted = useRef(new Set<number>())
  const pending = useRef({ keys: new Map<string, unknown[]>(), notify: false })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    connectedAt.current = Date.now()
    return () => clearTimeout(timer.current)
  }, [])

  const toastNewRows = useCallback(async () => {
    const page = await fetchCustomerNotifications(getToken, { limit: 10 })
    // A little slack for clock skew between the API and this browser.
    const since = connectedAt.current - 5_000
    const fresh = page.items.filter(
      (row) => !row.read_at && !toasted.current.has(row.id) && Date.parse(row.created_at) >= since
    )
    for (const row of fresh) toasted.current.add(row.id)
    if (fresh.length > MAX_TOASTS) {
      liveToast({
        title: `${fresh.length} new updates`,
        body: fresh
          .slice(0, 2)
          .map((row) => row.title)
          .join(" · "),
        action: { label: "Open inbox", href: "/notifications" },
        sound: "chime",
        key: `burst:${fresh[0]!.id}`,
      })
      return
    }
    for (const row of fresh) {
      const { tone, sound } = customerToastTone(row.type)
      liveToast({
        title: row.title,
        body: row.body,
        tone,
        at: row.created_at,
        action: row.href ? { label: "View", href: row.href } : undefined,
        sound,
        key: `notification:${row.id}`,
      })
    }
  }, [getToken])

  const flush = useCallback(() => {
    const { keys, notify } = pending.current
    pending.current = { keys: new Map(), notify: false }
    for (const key of keys.values()) void queryClient.invalidateQueries({ queryKey: key })
    if (notify) void toastNewRows().catch(() => {})
  }, [queryClient, toastNewRows])

  const onEvent = useCallback(
    (event: LiveEvent) => {
      for (const key of customerKeysForEvent(event)) pending.current.keys.set(JSON.stringify(key), key)
      // Your own action still refreshes the screen, it just doesn't toast you about it.
      if (event.topic === "notification" && event.actor !== userId) pending.current.notify = true
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, COALESCE_MS)
    },
    [flush, userId]
  )

  const onReconnect = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["customer-notifications"] })
    void queryClient.invalidateQueries({ queryKey: ["customer-analytics"] })
  }, [queryClient])

  useLiveEvents({
    url: userId ? `${apiPublicUrl()}/v1/customer/live` : null,
    getToken,
    onEvent,
    onReconnect,
  })

  return null
}

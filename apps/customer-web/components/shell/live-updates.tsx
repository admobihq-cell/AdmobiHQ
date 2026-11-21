"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { customerKeysForEvent, customerToastTone, type LiveEvent } from "@workspace/ops-contracts"

import { liveToast } from "@workspace/ui/components/live-toast"
import { useLiveEvents } from "@workspace/ui/lib/live-events"

import { fetchCustomerNotifications } from "@/lib/customer-notifications-client"
import { apiPublicUrl } from "@/lib/site-urls"

/**
 * A bulk review publishes one event per campaign, each a second or so apart, so events are
 * coalesced over a quiet period (with a ceiling) into one refetch per key and one toast pass.
 */
const QUIET_MS = 1500
const MAX_WAIT_MS = 4000

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
  const firstPending = useRef(0)

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
    // Oldest first, so a folded burst reads in order; liveToast caps a burst at 3 + a summary.
    for (const row of fresh.reverse()) {
      toasted.current.add(row.id)
      const { tone, sound } = customerToastTone(row.type)
      liveToast({
        title: row.title,
        body: row.body,
        tone,
        at: row.created_at,
        action: row.href ? { label: "View", href: row.href } : undefined,
        sound,
        key: `notification:${row.id}`,
        overflowHref: "/notifications",
      })
    }
  }, [getToken])

  const flush = useCallback(() => {
    firstPending.current = 0
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
      const now = Date.now()
      if (!firstPending.current) firstPending.current = now
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, Math.min(QUIET_MS, firstPending.current + MAX_WAIT_MS - now))
    },
    [flush, userId]
  )

  // Only after a real gap (never the routine ~280 s reconnect): refresh everything an event could
  // have touched while the stream was down.
  const onReconnect = useCallback(() => {
    for (const key of [
      ["customer-notifications"],
      ["customer-analytics"],
      ["customer-campaigns"],
      ["customer-campaign"],
      ["customer-payment"],
    ]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }, [queryClient])

  useLiveEvents({
    url: userId ? `${apiPublicUrl()}/v1/customer/live` : null,
    getToken,
    onEvent,
    onReconnect,
  })

  return null
}

"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { driverKeysForEvent, driverToastTone, type LiveEvent } from "@workspace/ops-contracts"

import { liveToast } from "@workspace/ui/components/live-toast"
import { useLiveEvents } from "@workspace/ui/lib/live-events"

import { fetchDriverNotifications } from "@/lib/driver-notifications-client"
import { expireDriverProfile } from "@/lib/live-actions"
import { apiPublicUrl } from "@/lib/site-urls"

/**
 * Keeps the driver app live: refreshes whatever an event makes stale and toasts new inbox rows.
 * Toast text comes from the refetched row; the event itself is ids only.
 */
export function LiveUpdates() {
  const { getToken, userId } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const connectedAt = useRef(0)
  const toasted = useRef(new Set<number>())

  useEffect(() => {
    connectedAt.current = Date.now()
  }, [])

  // Verification status is server-rendered and cached, so a refetch alone won't move it.
  const refreshProfile = useCallback(() => {
    void expireDriverProfile()
      .catch(() => {})
      .then(() => router.refresh())
  }, [router])

  const toastNewRows = useCallback(async () => {
    const page = await fetchDriverNotifications(getToken, { limit: 10 })
    // A little slack for clock skew between the API and this browser.
    const since = connectedAt.current - 5_000
    const fresh = page.items.filter(
      (row) => !row.read_at && !toasted.current.has(row.id) && Date.parse(row.created_at) >= since
    )
    for (const row of fresh.reverse()) {
      toasted.current.add(row.id)
      liveToast({
        title: row.title,
        body: row.body,
        ...driverToastTone(row.type),
        at: row.created_at,
        key: `notification:${row.id}`,
        overflowHref: "/notifications",
      })
    }
  }, [getToken])

  const onEvent = useCallback(
    (event: LiveEvent) => {
      for (const key of driverKeysForEvent(event)) void queryClient.invalidateQueries({ queryKey: key })
      if (event.type?.startsWith("application_")) refreshProfile()
      if (event.topic === "notification" && event.actor !== userId) void toastNewRows().catch(() => {})
    },
    [queryClient, refreshProfile, toastNewRows, userId]
  )

  const onReconnect = useCallback(() => {
    for (const key of ["driver-notifications", "driver-profile", "driver-payouts", "sos"]) {
      void queryClient.invalidateQueries({ queryKey: [key] })
    }
    refreshProfile()
  }, [queryClient, refreshProfile])

  useLiveEvents({
    url: userId ? `${apiPublicUrl()}/v1/driver/live` : null,
    getToken,
    onEvent,
    onReconnect,
  })

  return null
}

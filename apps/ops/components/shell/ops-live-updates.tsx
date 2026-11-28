"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { FileCheck2, Inbox, LifeBuoy, MonitorPlay, Siren, Wallet } from "lucide-react"
import { getApiBaseUrl } from "@workspace/ops-api-client"
import type { LiveEvent, LiveTopic, OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { liveToast, type LiveToastInput } from "@workspace/ui/components/live-toast"
import { useLiveEvents } from "@workspace/ui/lib/live-events"

import { expireLiveCache } from "@/lib/live-actions"

type Route = {
  permission: OpsPermission
  keys: unknown[][]
  /** Left out, or returning null, for events that only refresh data. */
  toast?: (event: LiveEvent) => LiveToastInput | null
}

/** What each ops event refreshes, and the toast a viewer with the permission sees. */
const ROUTES: Partial<Record<LiveTopic, Route>> = {
  sos: {
    permission: "safety",
    keys: [["ops-notifications", "safety"], ["ops-sos"]],
    toast: ({ id }) => ({
      title: "SOS reported",
      body: "A driver needs a responder now.",
      tone: "warning",
      icon: Siren,
      sticky: true,
      sound: "low",
      action: { label: "Respond", href: id ? `/sos/${id}` : "/sos" },
    }),
  },
  "review-queue": {
    permission: "campaigns",
    keys: [["ops-campaigns"]],
    toast: ({ id }) => ({
      title: "Campaign submitted for review",
      icon: MonitorPlay,
      sound: "chime",
      action: { label: "Review", href: id ? `/campaigns/${id}` : "/campaigns" },
    }),
  },
  campaign: {
    permission: "campaigns",
    keys: [["ops-campaigns"]],
    toast: ({ id, type }) =>
      type === "withdrawn"
        ? {
            title: "Campaign withdrawn by the advertiser",
            tone: "warning",
            icon: MonitorPlay,
            sound: "chime",
            action: { label: "Open", href: id ? `/campaigns/${id}` : "/campaigns" },
          }
        : null,
  },
  payment: {
    permission: "finances",
    keys: [],
    toast: () => ({
      title: "Payment received",
      tone: "success",
      icon: Wallet,
      sound: "ping",
      action: { label: "Ledger", href: "/finances?tab=ledger" },
    }),
  },
  support: {
    permission: "support",
    keys: [["ops-notifications", "support"], ["ops-support"]],
    toast: ({ id }) => ({
      title: "New support case",
      icon: LifeBuoy,
      sound: "chime",
      action: { label: "Open", href: id ? `/support/${id}` : "/support" },
    }),
  },
  application: {
    permission: "driver_applications",
    keys: [["ops-notifications", "applications"], ["ops-driver-applications"]],
    // A `type` means a colleague reviewed it: refresh only.
    toast: ({ id, type }) =>
      type
        ? null
        : {
            title: "New driver application",
            icon: FileCheck2,
            sound: "chime",
            action: { label: "Review", href: id ? `/driver-applications/${id}` : "/driver-applications" },
          },
  },
}

/** Public forms share the `submission` topic; the event's `type` picks the list. */
function submissionRoute(kind: string, permission: OpsPermission, title: string, href: string, api: string): Route {
  return {
    permission,
    keys: [["ops-notifications", kind], ["ops-entity", api]],
    toast: () => ({ title, icon: Inbox, sound: "chime", action: { label: "Open", href } }),
  }
}

const SUBMISSIONS: Record<string, Route> = {
  lead: submissionRoute("leads", "leads", "New campaign lead", "/leads", "/v1/leads"),
  fleet: submissionRoute("fleet", "fleet", "New fleet partner application", "/fleet", "/v1/fleet"),
  "driver-lead": submissionRoute("driver-leads", "drivers", "New driver signup", "/drivers", "/v1/drivers"),
  waitlist: submissionRoute("waitlist", "waitlist", "New waitlist signup", "/waitlist", "/v1/waitlist"),
  "media-kit": submissionRoute("media-kit", "media_kit", "New media kit request", "/media-kit", "/v1/media-kit"),
}

/**
 * Keeps ops live: refreshes the queues an event touches, re-renders server-rendered counts and
 * dashboards past their cache, and toasts only what this role may see. The event carries ids;
 * the toast copy is static.
 */
export function OpsLiveUpdates({ role, permissions }: { role: OpsRole; permissions: OpsPermission[] }) {
  const { getToken, isSignedIn, userId } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(refreshTimer.current), [])

  const refreshSidebar = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      // Still re-render if expiring fails: stale numbers beat a frozen screen.
      void expireLiveCache()
        .catch(() => {})
        .then(() => router.refresh())
    }, 1000)
  }, [router])

  const onEvent = useCallback(
    (event: LiveEvent) => {
      const route = event.topic === "submission" ? SUBMISSIONS[event.type ?? ""] : ROUTES[event.topic]
      if (!route) return
      for (const key of route.keys) void queryClient.invalidateQueries({ queryKey: key })
      refreshSidebar()
      // Your own action refreshes the screen without toasting you about it.
      if (event.actor && event.actor === userId) return
      if (role !== "admin" && !permissions.includes(route.permission)) return
      const toast = route.toast?.(event)
      // The publisher's nonce is the same in every open tab, so only one of them plays the sound.
      if (toast) liveToast({ ...toast, key: event.nonce ?? `${event.topic}:${event.id}`, overflowHref: "/notifications" })
    },
    [permissions, queryClient, refreshSidebar, role, userId]
  )

  const onReconnect = useCallback(() => {
    for (const key of ["ops-notifications", "ops-campaigns", "ops-driver-applications", "ops-entity", "ops-sos", "ops-support"]) {
      void queryClient.invalidateQueries({ queryKey: [key] })
    }
    refreshSidebar()
  }, [queryClient, refreshSidebar])

  // Wait for Clerk: a request before sign-in loads would only collect a 401.
  useLiveEvents({ url: isSignedIn ? `${getApiBaseUrl()}/v1/ops/live` : null, getToken, onEvent, onReconnect })

  return null
}

"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { useQueryClient } from "@tanstack/react-query"
import { FileCheck2, LifeBuoy, MonitorPlay, Siren, Wallet } from "lucide-react"
import { getApiBaseUrl } from "@workspace/ops-api-client"
import type { LiveEvent, LiveTopic, OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { liveToast, type LiveToastInput } from "@workspace/ui/components/live-toast"
import { useLiveEvents } from "@workspace/ui/lib/live-events"

type Route = {
  permission: OpsPermission
  keys: unknown[][]
  toast: (id: number | undefined) => LiveToastInput
}

/** What each ops event refreshes, and the toast a viewer with the permission sees. */
const ROUTES: Partial<Record<LiveTopic, Route>> = {
  sos: {
    permission: "safety",
    keys: [["ops-notifications", "safety"], ["ops-sos"]],
    toast: (id) => ({
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
    toast: (id) => ({
      title: "Campaign submitted for review",
      icon: MonitorPlay,
      sound: "chime",
      action: { label: "Review", href: id ? `/campaigns/${id}` : "/campaigns" },
    }),
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
    toast: (id) => ({
      title: "New support case",
      icon: LifeBuoy,
      sound: "chime",
      action: { label: "Open", href: id ? `/support/${id}` : "/support" },
    }),
  },
  application: {
    permission: "driver_applications",
    keys: [["ops-notifications", "applications"], ["ops-driver-applications"]],
    toast: (id) => ({
      title: "New driver application",
      icon: FileCheck2,
      sound: "chime",
      action: { label: "Review", href: id ? `/driver-applications/${id}` : "/driver-applications" },
    }),
  },
}

/**
 * Keeps ops live: refreshes the queues an event touches, re-renders the server sidebar counts,
 * and toasts only what this role may see. The event carries ids; the toast copy is static.
 */
export function OpsLiveUpdates({ role, permissions }: { role: OpsRole; permissions: OpsPermission[] }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(refreshTimer.current), [])

  const refreshSidebar = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => router.refresh(), 1000)
  }, [router])

  const onEvent = useCallback(
    (event: LiveEvent) => {
      const route = ROUTES[event.topic]
      if (!route) return
      for (const key of route.keys) void queryClient.invalidateQueries({ queryKey: key })
      refreshSidebar()
      if (role !== "admin" && !permissions.includes(route.permission)) return
      liveToast({ ...route.toast(event.id), key: `${event.topic}:${event.id ?? Date.now()}` })
    },
    [permissions, queryClient, refreshSidebar, role]
  )

  const onReconnect = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["ops-notifications"] })
    refreshSidebar()
  }, [queryClient, refreshSidebar])

  useLiveEvents({ url: `${getApiBaseUrl()}/v1/ops/live`, getToken, onEvent, onReconnect })

  return null
}

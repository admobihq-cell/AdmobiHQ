"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"

import type {
  NotificationFeedItem,
  NotificationTone,
} from "@workspace/ui/lib/notifications"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { useOpsClient } from "@/lib/ops-client"

const SEEN_STORAGE_KEY = "ops-notifications-seen-v1"
const CLOSED_SUPPORT = new Set(["resolved", "closed"])
const SOURCE_LIMIT = 25

type Access = { role: OpsRole; permissions: OpsPermission[] }

function useSeenIds() {
  const [seen, setSeen] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_STORAGE_KEY)
      if (raw) setSeen(new Set(JSON.parse(raw) as string[]))
    } catch {
      // private mode / blocked storage — triage state just won't persist
    }
  }, [])

  const persist = useCallback((next: Set<string>) => {
    setSeen(next)
    try {
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      // ignore
    }
  }, [])

  return {
    seen,
    markSeen: (id: string) => persist(new Set(seen).add(id)),
    markUnseen: (id: string) => {
      const next = new Set(seen)
      next.delete(id)
      persist(next)
    },
    markAllSeen: (ids: string[]) => persist(new Set([...seen, ...ids])),
  }
}

/**
 * The ops "notifications" surface is an attention queue, not a message log:
 * submitted driver applications, live support cases, and recent announcements,
 * each filtered to what the viewer is allowed to see. There's no server-side
 * read state for these, so "read" is a per-browser "I've triaged this" flag.
 */
export function useOpsNotifications(access: Access) {
  const client = useOpsClient()
  const canSee = useCallback(
    (permission: OpsPermission) =>
      access.role === "admin" || access.permissions.includes(permission),
    [access],
  )

  const seeApplications = canSee("driver_applications")
  const seeSupport = canSee("support")
  const seeAnnouncements = canSee("announcements")

  const results = useQueries({
    queries: [
      {
        queryKey: ["ops-notifications", "applications"],
        enabled: seeApplications,
        queryFn: () =>
          client.driverApplications.list({
            status: "submitted",
            pageSize: SOURCE_LIMIT,
          }),
        retry: false,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["ops-notifications", "support"],
        enabled: seeSupport,
        queryFn: () => client.support.list({ pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["ops-notifications", "announcements"],
        enabled: seeAnnouncements,
        queryFn: () =>
          client.notifications.list({ page: 1, pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
    ],
  })

  const [applicationsQuery, supportQuery, announcementsQuery] = results
  const { seen, markSeen, markUnseen, markAllSeen } = useSeenIds()

  const rawItems = useMemo<
    Array<Omit<NotificationFeedItem, "readAt"> & { createdAt: string }>
  >(() => {
    const items: Array<Omit<NotificationFeedItem, "readAt">> = []

    for (const application of applicationsQuery.data?.items ?? []) {
      items.push({
        id: `driver-application:${application.id}`,
        title: application.full_name ?? "Driver application",
        body: [application.city, application.phone]
          .filter(Boolean)
          .join(" · ") || "Awaiting review",
        category: "Driver application",
        tone: "info" as NotificationTone,
        href: `/driver-applications/${application.id}`,
        createdAt:
          application.submitted_at ?? application.created_at,
      })
    }

    for (const supportCase of supportQuery.data?.items ?? []) {
      if (CLOSED_SUPPORT.has(supportCase.status)) continue
      const urgent = ["urgent", "high"].includes(supportCase.priority)
      items.push({
        id: `support-case:${supportCase.id}`,
        title: supportCase.subject,
        body: `${supportCase.contact_name} · ${supportCase.category}${
          supportCase.assigned_to_email
            ? ` · ${supportCase.assigned_to_email}`
            : " · unassigned"
        }`,
        category: "Support",
        tone: urgent ? "warning" : "neutral",
        href: `/support/${supportCase.id}`,
        createdAt: supportCase.updated_at,
      })
    }

    for (const announcement of announcementsQuery.data?.items ?? []) {
      if (announcement.deleted_at) continue
      items.push({
        id: `announcement:${announcement.id}`,
        title: announcement.title,
        body: announcement.body,
        category: "Announcement",
        tone: "neutral",
        href: "/announcements",
        createdAt: announcement.created_at,
      })
    }

    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [applicationsQuery.data, supportQuery.data, announcementsQuery.data])

  const items = useMemo<NotificationFeedItem[]>(
    () =>
      rawItems.map((item) => ({
        ...item,
        readAt: seen.has(item.id) ? item.createdAt : null,
      })),
    [rawItems, seen],
  )

  return {
    items,
    isPending: results.some((result) => result.isPending && result.fetchStatus !== "idle"),
    markRead: (id: string) => markSeen(id),
    markUnread: (id: string) => markUnseen(id),
    markAllRead: () => markAllSeen(rawItems.map((item) => item.id)),
  }
}

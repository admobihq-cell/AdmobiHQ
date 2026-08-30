"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"

import type { NotificationFeedItem } from "@workspace/ui/lib/notifications"
import type { OpsPermission, OpsRole } from "@workspace/ops-contracts"

import { useOpsClient } from "@/lib/ops-client"

const SEEN_STORAGE_KEY = "ops-notifications-seen-v1"
const CLOSED_SUPPORT = new Set(["resolved", "closed"])
const SOURCE_LIMIT = 25
/** Signup-style sources have no triage state, so only surface recent ones. */
const RECENCY_DAYS = 21

type Access = { role: OpsRole; permissions: OpsPermission[] }
type RawItem = Omit<NotificationFeedItem, "readAt">

function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < RECENCY_DAYS * 86_400_000
}

function joinMeta(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ")
}

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
 * The ops "notifications" surface is an attention queue, not a message log. It
 * pulls the same events that today only fire an admin email + an ops-mobile
 * push and then vanish — new public-form submissions plus open review work —
 * each gated to what the viewer is allowed to see. There's no server-side read
 * state for these, so "read" is a per-browser "I've triaged this" flag.
 */
export function useOpsNotifications(access: Access) {
  const client = useOpsClient()
  const canSee = useCallback(
    (permission: OpsPermission) =>
      access.role === "admin" || access.permissions.includes(permission),
    [access],
  )

  const [
    applicationsQuery,
    supportQuery,
    leadsQuery,
    fleetQuery,
    driverLeadsQuery,
    waitlistQuery,
    mediaKitQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ["ops-notifications", "applications"],
        enabled: canSee("driver_applications"),
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
        enabled: canSee("support"),
        queryFn: () => client.support.list({ pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["ops-notifications", "leads"],
        enabled: canSee("leads"),
        queryFn: () =>
          client.leads.list({ status: "new", pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["ops-notifications", "fleet"],
        enabled: canSee("fleet"),
        queryFn: () =>
          client.fleet.list({ status: "pending", pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["ops-notifications", "driver-leads"],
        enabled: canSee("drivers"),
        queryFn: () =>
          client.drivers.list({ status: "pending", pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["ops-notifications", "waitlist"],
        enabled: canSee("waitlist"),
        queryFn: () => client.waitlist.list({ pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ["ops-notifications", "media-kit"],
        enabled: canSee("media_kit"),
        queryFn: () => client.mediaKit.list({ pageSize: SOURCE_LIMIT }),
        retry: false,
        refetchOnWindowFocus: false,
      },
    ],
  })

  const { seen, markSeen, markUnseen, markAllSeen } = useSeenIds()

  const rawItems = useMemo<RawItem[]>(() => {
    const items: RawItem[] = []

    for (const a of applicationsQuery.data?.items ?? []) {
      items.push({
        id: `driver-application:${a.id}`,
        title: a.full_name ?? "Driver application",
        body: joinMeta(a.city, a.phone) || "Awaiting review",
        category: "Driver application",
        tone: "info",
        href: `/driver-applications/${a.id}`,
        createdAt: a.submitted_at ?? a.created_at,
      })
    }

    for (const c of supportQuery.data?.items ?? []) {
      if (CLOSED_SUPPORT.has(c.status)) continue
      items.push({
        id: `support-case:${c.id}`,
        title: c.subject,
        body: joinMeta(
          c.contact_name,
          c.category,
          c.assigned_to_email ?? "unassigned",
        ),
        category: "Support",
        tone: ["urgent", "high"].includes(c.priority) ? "warning" : "neutral",
        href: `/support/${c.id}`,
        createdAt: c.updated_at,
      })
    }

    for (const l of leadsQuery.data?.items ?? []) {
      items.push({
        id: `lead:${l.id}`,
        title: l.company_name || l.contact_name,
        body: joinMeta(l.contact_name, l.budget_range, l.cities.join(", ")),
        category: "Campaign lead",
        tone: "success",
        href: "/leads",
        createdAt: l.created_at,
      })
    }

    for (const f of fleetQuery.data?.items ?? []) {
      items.push({
        id: `fleet:${f.id}`,
        title: f.company_name,
        body: joinMeta(f.primary_contact_name, f.city, f.fleet_size),
        category: "Fleet partner",
        tone: "info",
        href: "/fleet",
        createdAt: f.created_at,
      })
    }

    for (const d of driverLeadsQuery.data?.items ?? []) {
      items.push({
        id: `driver-lead:${d.id}`,
        title: d.name,
        body: joinMeta(d.city, d.vehicle_type, d.phone),
        category: "Driver lead",
        tone: "info",
        href: "/drivers",
        createdAt: d.created_at,
      })
    }

    for (const w of waitlistQuery.data?.items ?? []) {
      if (!isRecent(w.created_at)) continue
      items.push({
        id: `waitlist:${w.id}`,
        title: w.email,
        body: joinMeta("Waitlist signup", w.source),
        category: "Waitlist",
        tone: "neutral",
        href: "/waitlist",
        createdAt: w.created_at,
      })
    }

    for (const m of mediaKitQuery.data?.items ?? []) {
      if (!isRecent(m.created_at)) continue
      items.push({
        id: `media-kit:${m.id}`,
        title: m.name,
        body: joinMeta(m.email, "Requested the media kit"),
        category: "Media kit",
        tone: "neutral",
        href: "/media-kit",
        createdAt: m.created_at,
      })
    }

    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [
    applicationsQuery.data,
    supportQuery.data,
    leadsQuery.data,
    fleetQuery.data,
    driverLeadsQuery.data,
    waitlistQuery.data,
    mediaKitQuery.data,
  ])

  const items = useMemo<NotificationFeedItem[]>(
    () =>
      rawItems.map((item) => ({
        ...item,
        readAt: seen.has(item.id) ? item.createdAt : null,
      })),
    [rawItems, seen],
  )

  const queries = [
    applicationsQuery,
    supportQuery,
    leadsQuery,
    fleetQuery,
    driverLeadsQuery,
    waitlistQuery,
    mediaKitQuery,
  ]

  return {
    items,
    isPending: queries.some(
      (query) => query.isPending && query.fetchStatus !== "idle",
    ),
    markRead: (id: string) => markSeen(id),
    markUnread: (id: string) => markUnseen(id),
    markAllRead: () => markAllSeen(rawItems.map((item) => item.id)),
  }
}

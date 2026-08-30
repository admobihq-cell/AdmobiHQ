"use client"

/**
 * DIRECTION CONTRACT — notifications inbox (canon Operate build)
 *
 * THESIS: A dedicated, quiet inbox that reads like Linear/GitHub notifications —
 *   date-grouped single column, unread carried by weight not colour, one accent.
 *   It refuses the loud red-pill dot and the "dropdown but taller" non-page.
 * OWN-WORLD: The established Admobi shell — warm neutrals, one terracotta accent,
 *   Geist, shadcn primitives. Unread = filled dot in the gutter + medium title +
 *   a 3%-tint row. Everything else is muted foreground on the paper ground.
 * STORY: The user scans "what happened since I last looked", reads one in place,
 *   clears the rest, and leaves. Keyboard j/k/e/Enter for power users.
 * FIRST VIEWPORT: page title + unread count, a small All/Unread segmented control
 *   and type filters, then "Today" and its rows. "Mark all read" top-right.
 * FORM: single-column reverse-chronological feed (the category standard, chosen
 *   by the user over a master/detail split). Seed key ef6b28b8.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, and DESIGN.md.
 */

import { useEffect, useState } from "react"

export type NotificationTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"

/** App-agnostic shape every notifications surface normalises its rows to. */
export type NotificationFeedItem = {
  /** Stable, source-qualified id, e.g. `announcement:42` or `driver-notification:7`. */
  id: string
  title: string
  body: string
  /** Human label for the kind of notification, e.g. "Announcement", "Payout". */
  category: string
  tone: NotificationTone
  /** Internal route this notification points at, if any. */
  href?: string
  imageUrl?: string | null
  /** ISO timestamp. */
  createdAt: string
  /** ISO timestamp, or null when unread. */
  readAt: string | null
}

export type NotificationDateGroup = {
  key: "today" | "yesterday" | "this-week" | "this-month" | "older"
  label: string
  items: NotificationFeedItem[]
}

const GROUP_LABELS: Record<NotificationDateGroup["key"], string> = {
  today: "Today",
  yesterday: "Yesterday",
  "this-week": "Earlier this week",
  "this-month": "Earlier this month",
  older: "Older",
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function groupKeyFor(created: Date, now: Date): NotificationDateGroup["key"] {
  const today = startOfDay(now)
  const createdDay = startOfDay(created)
  const dayMs = 86_400_000
  const diffDays = Math.round((today.getTime() - createdDay.getTime()) / dayMs)

  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return "this-week"
  if (diffDays < 31) return "this-month"
  return "older"
}

/** Buckets a pre-sorted (newest-first) list into date sections, dropping empties. */
export function groupNotificationsByDate(
  items: NotificationFeedItem[],
  now: Date = new Date(),
): NotificationDateGroup[] {
  const order: NotificationDateGroup["key"][] = [
    "today",
    "yesterday",
    "this-week",
    "this-month",
    "older",
  ]
  const buckets = new Map<NotificationDateGroup["key"], NotificationFeedItem[]>()

  for (const item of items) {
    const key = groupKeyFor(new Date(item.createdAt), now)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }

  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: GROUP_LABELS[key],
      items: buckets.get(key)!,
    }))
}

const RELATIVE_DIVISIONS: Array<{ limit: number; unit: string; ms: number }> = [
  { limit: 60_000, unit: "s", ms: 1_000 },
  { limit: 3_600_000, unit: "m", ms: 60_000 },
  { limit: 86_400_000, unit: "h", ms: 3_600_000 },
  { limit: 604_800_000, unit: "d", ms: 86_400_000 },
]

/** "just now" · "4m" · "3h" · "6d" · "12 Mar" · "12 Mar 2024". Compact, for the meta line. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()

  if (diff < 45_000) return "just now"

  for (const division of RELATIVE_DIVISIONS) {
    if (diff < division.limit) {
      return `${Math.max(1, Math.round(diff / division.ms))}${division.unit}`
    }
  }

  const sameYear = then.getFullYear() === now.getFullYear()
  return then.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

/** Absolute timestamp for tooltips / the reading view. */
export function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/** Re-renders on an interval so relative timestamps stay honest while the page is open. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

export function unreadCount(items: NotificationFeedItem[]): number {
  return items.reduce((count, item) => (item.readAt ? count : count + 1), 0)
}

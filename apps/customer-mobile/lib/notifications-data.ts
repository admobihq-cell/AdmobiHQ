import { Gift, Megaphone, Receipt, Send, Warning, type AppIcon } from "@/components/icons"

export type NotificationCategory = "campaign" | "billing" | "announcement" | "promo" | "system"
export type NotificationGroup = "today" | "earlier"

export type NotificationItem = {
  id: string
  category: NotificationCategory
  title: string
  body: string
  /** ISO timestamp — formatted at render so relative labels stay current. */
  createdAt: string
  read: boolean
  group: NotificationGroup
}

export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, AppIcon> = {
  campaign: Megaphone,
  billing: Receipt,
  announcement: Send,
  promo: Gift,
  system: Warning,
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  campaign: "Campaigns",
  billing: "Billing",
  announcement: "Announcements",
  promo: "Offers",
  system: "System",
}

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  "campaign",
  "billing",
  "announcement",
  "promo",
  "system",
]

export const NOTIFICATION_CATEGORIES = NOTIFICATION_CATEGORY_ORDER

export type AnnouncementBroadcastDto = {
  id: number
  title: string
  body: string
  category?: string | null
  created_at: string
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function dayDiff(iso: string, now = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
}

/** Relative label that updates when re-rendered (minutes → hours → days). */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""

  const diffMs = Math.max(0, now - then)
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24 && dayDiff(iso, new Date(now)) <= 0) {
    return `${hours}h ago`
  }

  const days = dayDiff(iso, new Date(now))
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function parseCategory(value: string | null | undefined): NotificationCategory {
  if (value && NOTIFICATION_CATEGORY_ORDER.includes(value as NotificationCategory)) {
    return value as NotificationCategory
  }
  return "announcement"
}

export function announcementToNotificationItem(dto: AnnouncementBroadcastDto): NotificationItem {
  return {
    id: `announcement-${dto.id}`,
    category: parseCategory(dto.category),
    title: dto.title,
    body: dto.body,
    createdAt: dto.created_at,
    read: false,
    group: dayDiff(dto.created_at) <= 0 ? "today" : "earlier",
  }
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

/** Seed rows for empty installs — real ops broadcasts replace/merge on top. */
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    category: "announcement",
    title: "Schedule by time of day is here",
    body: "Set campaigns to run only during the hours your audience is out and about.",
    createdAt: hoursAgoIso(1),
    read: false,
    group: "today",
  },
  {
    id: "2",
    category: "campaign",
    title: "Westlands Retail Push hit 92% delivery",
    body: "Your weekly target for this flight is nearly met.",
    createdAt: hoursAgoIso(2),
    read: false,
    group: "today",
  },
  {
    id: "3",
    category: "campaign",
    title: "CBD Summer Flight: 18 new proof-of-play events",
    body: "Fresh delivery evidence just came in from the fleet.",
    createdAt: hoursAgoIso(5),
    read: true,
    group: "today",
  },
  {
    id: "4",
    category: "billing",
    title: "Your invoice for June is ready",
    body: "KES 420,000 — view the breakdown by campaign in Billing.",
    createdAt: daysAgoIso(1),
    read: true,
    group: "earlier",
  },
  {
    id: "5",
    category: "campaign",
    title: "Karen Estate Awareness starts Monday",
    body: "6 corridors scheduled to go live at 6:00 AM.",
    createdAt: daysAgoIso(1),
    read: true,
    group: "earlier",
  },
  {
    id: "6",
    category: "promo",
    title: "Refer a business, get 10% off your next flight",
    body: "Share your referral link from Settings to start earning credit.",
    createdAt: daysAgoIso(3),
    read: true,
    group: "earlier",
  },
  {
    id: "7",
    category: "system",
    title: "Delivery reporting accuracy improved",
    body: "Proof-of-play timestamps now sync within 5 minutes of capture.",
    createdAt: daysAgoIso(5),
    read: true,
    group: "earlier",
  },
]

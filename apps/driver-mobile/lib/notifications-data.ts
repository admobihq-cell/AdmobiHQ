import { Gift, Megaphone, Receipt, Send, Warning, type AppIcon } from "@/components/icons"

export type NotificationCategory = "campaign" | "billing" | "announcement" | "promo" | "system"
export type NotificationGroup = "today" | "earlier"

export type NotificationItem = {
  id: string
  category: NotificationCategory
  title: string
  body: string
  imageUrl: string | null
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

export type AnnouncementDeliveryDto = {
  id: number
  title: string
  body: string
  category?: string | null
  image_url?: string | null
  read_at: string | null
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

export function announcementDeliveryToNotificationItem(dto: AnnouncementDeliveryDto): NotificationItem {
  return {
    id: `announcement-${dto.id}`,
    category: parseCategory(dto.category),
    title: dto.title,
    body: dto.body,
    imageUrl: dto.image_url ?? null,
    createdAt: dto.created_at,
    read: Boolean(dto.read_at),
    group: dayDiff(dto.created_at) <= 0 ? "today" : "earlier",
  }
}

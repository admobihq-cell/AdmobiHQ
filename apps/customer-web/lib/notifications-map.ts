import type {
  NotificationFeedItem,
  NotificationTone,
} from "@workspace/ui/lib/notifications"

import type { CustomerAnnouncementDto } from "@/lib/announcements-client"

const CATEGORY_LABELS: Record<string, string> = {
  announcement: "Announcement",
  campaign: "Campaign",
  billing: "Billing",
  promo: "Promotion",
  system: "System",
}

const CATEGORY_TONES: Record<string, NotificationTone> = {
  announcement: "neutral",
  campaign: "info",
  billing: "warning",
  promo: "success",
  system: "info",
}

export function announcementToFeedItem(
  announcement: CustomerAnnouncementDto,
): NotificationFeedItem {
  return {
    id: `announcement:${announcement.id}`,
    title: announcement.title,
    body: announcement.body,
    category: CATEGORY_LABELS[announcement.category] ?? "Announcement",
    tone: CATEGORY_TONES[announcement.category] ?? "neutral",
    imageUrl: announcement.image_url,
    createdAt: announcement.created_at,
    readAt: announcement.read_at,
  }
}

/** `announcement:42` → `42`. Returns null for any other id shape. */
export function announcementIdFromFeedItem(feedId: string): number | null {
  const [kind, raw] = feedId.split(":")
  if (kind !== "announcement") return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

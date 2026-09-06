import type {
  NotificationFeedItem,
  NotificationTone,
} from "@workspace/ui/lib/notifications"

import type { CustomerNotificationDto } from "@workspace/ops-contracts"

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

const CAMPAIGN_TONES: Record<string, NotificationTone> = {
  campaign_submitted: "info",
  campaign_approved: "success",
  campaign_rejected: "warning",
  campaign_changes_requested: "warning",
}

/** Campaign lifecycle events. `href` comes from the API rather than being
 * derived here, so the web row and the Expo notification tap land in the same
 * place. */
export function campaignNotificationToFeedItem(
  notification: CustomerNotificationDto,
): NotificationFeedItem {
  return {
    id: `campaign-notification:${notification.id}`,
    title: notification.title,
    body: notification.body,
    category: "Campaign",
    tone: CAMPAIGN_TONES[notification.type] ?? "neutral",
    href: notification.href ?? undefined,
    createdAt: notification.created_at,
    readAt: notification.read_at,
  }
}

export type FeedSource = "announcement" | "campaign-notification"

/** `announcement:42` / `campaign-notification:42` → source + id. Returns null
 * for any other shape. */
export function parseFeedId(feedId: string): { source: FeedSource; id: number } | null {
  const [source, raw] = feedId.split(":")
  const id = Number(raw)
  if ((source === "announcement" || source === "campaign-notification") && Number.isFinite(id)) {
    return { source, id }
  }
  return null
}

/** `announcement:42` → `42`. Returns null for any other id shape. */
export function announcementIdFromFeedItem(feedId: string): number | null {
  const parsed = parseFeedId(feedId)
  return parsed?.source === "announcement" ? parsed.id : null
}

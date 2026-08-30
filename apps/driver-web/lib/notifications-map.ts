import type {
  NotificationFeedItem,
  NotificationTone,
} from "@workspace/ui/lib/notifications"
import type { DriverNotificationDto } from "@workspace/ops-contracts"

import type { DriverAnnouncementDto } from "@/lib/driver-notifications-client"

const ANNOUNCEMENT_LABELS: Record<string, string> = {
  announcement: "Announcement",
  campaign: "Campaign",
  billing: "Billing",
  promo: "Promotion",
  system: "System",
}

const ANNOUNCEMENT_TONES: Record<string, NotificationTone> = {
  announcement: "neutral",
  campaign: "info",
  billing: "warning",
  promo: "success",
  system: "info",
}

const LIFECYCLE_TONES: Record<string, NotificationTone> = {
  application_submitted: "info",
  application_approved: "success",
  application_rejected: "danger",
  application_changes_requested: "warning",
}

export function announcementToFeedItem(
  a: DriverAnnouncementDto,
): NotificationFeedItem {
  return {
    id: `announcement:${a.id}`,
    title: a.title,
    body: a.body,
    category: ANNOUNCEMENT_LABELS[a.category] ?? "Announcement",
    tone: ANNOUNCEMENT_TONES[a.category] ?? "neutral",
    imageUrl: a.image_url,
    createdAt: a.created_at,
    readAt: a.read_at,
  }
}

export function lifecycleToFeedItem(
  n: DriverNotificationDto,
): NotificationFeedItem {
  const isApplication = n.type.startsWith("application_")
  return {
    id: `driver-notification:${n.id}`,
    title: n.title,
    body: n.body,
    category: isApplication ? "Application" : "Update",
    tone: LIFECYCLE_TONES[n.type] ?? "neutral",
    href: isApplication ? "/settings/profile" : undefined,
    createdAt: n.created_at,
    readAt: n.read_at,
  }
}

export type FeedSource = "announcement" | "driver-notification"

export function parseFeedId(
  feedId: string,
): { source: FeedSource; id: number } | null {
  const [source, raw] = feedId.split(":")
  const id = Number(raw)
  if (
    (source === "announcement" || source === "driver-notification") &&
    Number.isFinite(id)
  ) {
    return { source, id }
  }
  return null
}

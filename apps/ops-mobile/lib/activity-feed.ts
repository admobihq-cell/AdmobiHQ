import { Car, FileText, Mail, Megaphone, Send, Truck, type AppIcon } from "@/components/icons"
import {
  formatDateTime,
  formatLabel,
  formatRelativeTime,
  type AuditEventDto,
} from "@workspace/ops-contracts"

export type ActivityCategory =
  | "lead"
  | "driver"
  | "fleet"
  | "waitlist"
  | "media_kit"
  | "announcement"
  | "other"

export type ActivityGroup = "today" | "earlier"

export type ActivityItem = {
  id: string
  category: ActivityCategory
  title: string
  body: string
  time: string
  read: boolean
  group: ActivityGroup
  href?: string
}

export const ACTIVITY_CATEGORY_ICONS: Record<ActivityCategory, AppIcon> = {
  lead: Megaphone,
  driver: Car,
  fleet: Truck,
  waitlist: Mail,
  media_kit: FileText,
  announcement: Send,
  other: Megaphone,
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  lead: "Leads",
  driver: "Drivers",
  fleet: "Fleet",
  waitlist: "Waitlist",
  media_kit: "Media kit",
  announcement: "Announcements",
  other: "Other",
}

export const ACTIVITY_CATEGORY_ORDER: ActivityCategory[] = [
  "lead",
  "driver",
  "fleet",
  "waitlist",
  "media_kit",
  "announcement",
]

function isToday(value: string): boolean {
  const d = new Date(value)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function entityTypeToCategory(entityType: string): ActivityCategory {
  switch (entityType) {
    case "lead":
      return "lead"
    case "driver":
      return "driver"
    case "fleet":
      return "fleet"
    case "waitlist":
      return "waitlist"
    case "media_kit":
      return "media_kit"
    case "announcement":
      return "announcement"
    default:
      return "other"
  }
}

export function auditEventToActivityItem(event: AuditEventDto): ActivityItem {
  const category = entityTypeToCategory(event.entity_type)
  const actor = event.actor_email ?? formatLabel(event.actor_type)
  return {
    id: `audit-${event.id}`,
    category,
    title: event.summary,
    body: `${actor} · ${formatLabel(event.action)}`,
    time: isToday(event.created_at)
      ? formatRelativeTime(event.created_at)
      : formatDateTime(event.created_at),
    read: true,
    group: isToday(event.created_at) ? "today" : "earlier",
  }
}

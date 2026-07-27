import { Gift, Megaphone, Receipt, Send, Warning, type AppIcon } from "@/components/icons"

export type NotificationCategory = "campaign" | "billing" | "announcement" | "promo" | "system"
export type NotificationGroup = "today" | "earlier"

export type NotificationItem = {
  id: string
  category: NotificationCategory
  title: string
  body: string
  time: string
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

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    category: "announcement",
    title: "Schedule by time of day is here",
    body: "Set campaigns to run only during the hours your audience is out and about.",
    time: "1h ago",
    read: false,
    group: "today",
  },
  {
    id: "2",
    category: "campaign",
    title: "Westlands Retail Push hit 92% delivery",
    body: "Your weekly target for this flight is nearly met.",
    time: "2h ago",
    read: false,
    group: "today",
  },
  {
    id: "3",
    category: "campaign",
    title: "CBD Summer Flight: 18 new proof-of-play events",
    body: "Fresh delivery evidence just came in from the fleet.",
    time: "5h ago",
    read: true,
    group: "today",
  },
  {
    id: "4",
    category: "billing",
    title: "Your invoice for June is ready",
    body: "KES 420,000 — view the breakdown by campaign in Billing.",
    time: "Yesterday",
    read: true,
    group: "earlier",
  },
  {
    id: "5",
    category: "campaign",
    title: "Karen Estate Awareness starts Monday",
    body: "6 corridors scheduled to go live at 6:00 AM.",
    time: "Yesterday",
    read: true,
    group: "earlier",
  },
  {
    id: "6",
    category: "promo",
    title: "Refer a business, get 10% off your next flight",
    body: "Share your referral link from Settings to start earning credit.",
    time: "3 days ago",
    read: true,
    group: "earlier",
  },
  {
    id: "7",
    category: "system",
    title: "Delivery reporting accuracy improved",
    body: "Proof-of-play timestamps now sync within 5 minutes of capture.",
    time: "5 days ago",
    read: true,
    group: "earlier",
  },
]

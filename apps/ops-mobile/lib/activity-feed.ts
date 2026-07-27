import { Car, Megaphone, Send, Warning, type AppIcon } from "@/components/icons"

export type ActivityCategory = "lead" | "driver" | "fleet" | "announcement"
export type ActivityGroup = "today" | "earlier"

export type ActivityItem = {
  id: string
  category: ActivityCategory
  title: string
  body: string
  time: string
  read: boolean
  group: ActivityGroup
}

export const ACTIVITY_CATEGORY_ICONS: Record<ActivityCategory, AppIcon> = {
  lead: Megaphone,
  driver: Car,
  fleet: Warning,
  announcement: Send,
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  lead: "Leads",
  driver: "Drivers",
  fleet: "Fleet",
  announcement: "Announcements",
}

export const ACTIVITY_CATEGORY_ORDER: ActivityCategory[] = [
  "lead",
  "driver",
  "fleet",
  "announcement",
]

// Local activity — no per-staff lead/driver/fleet event feed exists on the
// backend yet, so these stand in until that's wired up. Announcements (see
// activity.tsx) are real, fetched from the existing /notifications API.
export const PLACEHOLDER_ACTIVITY: ActivityItem[] = [
  {
    id: "p1",
    category: "lead",
    title: "New lead assigned: Jane Doe",
    body: "Nairobi CBD retail lead routed to you for follow-up.",
    time: "30m ago",
    read: false,
    group: "today",
  },
  {
    id: "p2",
    category: "driver",
    title: "Driver approved: John Otieno",
    body: "Background check cleared — ready for unit assignment.",
    time: "3h ago",
    read: false,
    group: "today",
  },
  {
    id: "p3",
    category: "fleet",
    title: "Unit #482 offline",
    body: "No heartbeat received in 6 hours — check installation.",
    time: "Yesterday",
    read: true,
    group: "earlier",
  },
]

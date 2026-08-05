import type { AnnouncementBroadcastDto } from "@/lib/notifications-data"

/**
 * Static sample content for the web demo build (apps/customer-mobile compiled
 * via `expo export --platform web` and embedded on the marketing site — see
 * lib/use-live-announcements.web.ts and lib/support.web.ts). Nothing here
 * touches a real backend.
 */
export const DEMO_ANNOUNCEMENTS: AnnouncementBroadcastDto[] = [
  {
    id: 9001,
    title: "Westlands corridor now live",
    body: "Taxi-top coverage has expanded along the Westlands–CBD route. Your active campaigns will pick up the new inventory automatically.",
    category: "announcement",
    image_url: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 9002,
    title: "Proof-of-play report ready",
    body: "Last week's GPS-verified screen hours are ready to view under Campaigns.",
    category: "campaign",
    image_url: null,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 9003,
    title: "Invoice paid",
    body: "Your October invoice was paid in full. Thanks for keeping your account current.",
    category: "billing",
    image_url: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

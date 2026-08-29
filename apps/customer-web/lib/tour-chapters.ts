import type { TourChapter } from "@workspace/ui/components/tour-provider"

/**
 * One chapter = one Tour step, anchored to a `data-tour-id` in AppShell.
 * The sidebar itself doesn't change between routes, so every chapter can
 * play (or be replayed from Settings) without navigating anywhere first.
 */
export const customerTourChapters: TourChapter[] = [
  {
    key: "welcome",
    title: "Welcome to Admobi",
    description:
      "You're in. Here's a two-minute lay of the land before you launch your first campaign.",
    selector: '[data-tour-id="tour-logo"]',
    placement: "bottomLeft",
    type: "primary",
  },
  {
    key: "overview",
    title: "Your account at a glance",
    description: "Overview is where your campaign performance and account summary live.",
    selector: '[data-tour-id="tour-nav-overview"]',
  },
  {
    key: "campaigns",
    title: "Launch out-of-home campaigns",
    description:
      "Create, edit, and monitor your taxi-top campaigns from here — this is command central.",
    selector: '[data-tour-id="tour-nav-campaigns"]',
  },
  {
    key: "calendar",
    title: "Plan on the calendar",
    description:
      "See every flight on a month grid, catch overlaps, and drop unscheduled drafts onto a start day.",
    selector: '[data-tour-id="tour-nav-calendar"]',
  },
  {
    key: "wallet",
    title: "Fund your campaigns",
    description:
      "Top up your wallet and track spend, so your campaigns never stall for budget.",
    selector: '[data-tour-id="tour-nav-wallet"]',
  },
  {
    key: "map",
    title: "See your reach on the map",
    description: "Watch where Admobi screens are running live across Nairobi.",
    selector: '[data-tour-id="tour-nav-map"]',
  },
  {
    key: "reports",
    title: "Measure what's working",
    description: "Performance metrics and delivery reports land here once your campaigns are live.",
    selector: '[data-tour-id="tour-nav-reports"]',
  },
  {
    key: "deliveries",
    title: "Book a delivery",
    description: "Need a screen-carrying driver to move something? Book pickups and drop-offs here.",
    selector: '[data-tour-id="tour-nav-deliveries"]',
  },
  {
    key: "settings",
    title: "Manage your account",
    description:
      "Billing, team, and account preferences live here — and you can replay this tour any time.",
    selector: '[data-tour-id="tour-nav-settings"]',
  },
]

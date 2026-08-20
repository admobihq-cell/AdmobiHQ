import type { TourChapter } from "@workspace/ui/components/tour-provider"

/**
 * One chapter = one Tour step, anchored to a `data-tour-id` in AppShell.
 * The sidebar itself doesn't change between routes, so every chapter can
 * play (or be replayed from Settings) without navigating anywhere first.
 */
export const driverTourChapters: TourChapter[] = [
  {
    key: "welcome",
    title: "You're verified — welcome aboard",
    description:
      "Your account just got the green light. Take a minute to see where everything lives before your first shift.",
    selector: '[data-tour-id="tour-logo"]',
    placement: "bottomLeft",
  },
  {
    key: "dashboard",
    title: "Your day at a glance",
    description:
      "Dashboard is home base — today's earnings, active routes, and recent activity all in one place.",
    selector: '[data-tour-id="tour-nav-dashboard"]',
  },
  {
    key: "earnings",
    title: "Track what you've earned",
    description:
      "Every payout period, screen-on hour, and route bonus lands here as it's earned.",
    selector: '[data-tour-id="tour-nav-earnings"]',
  },
  {
    key: "routes",
    title: "Your driving history",
    description:
      "See where you've driven and which routes paid off the most, so you can plan smarter next time.",
    selector: '[data-tour-id="tour-nav-routes"]',
  },
  {
    key: "payouts",
    title: "Get paid",
    description:
      "Pending and settled payouts are tracked here — check back after every cycle to confirm funds landed.",
    selector: '[data-tour-id="tour-nav-payouts"]',
  },
  {
    key: "deliveries",
    title: "Pick up delivery jobs",
    description:
      "Opted into carrying deliveries? Available and assigned jobs show up here as they come in.",
    selector: '[data-tour-id="tour-nav-deliveries"]',
  },
  {
    key: "settings",
    title: "Your profile, always in reach",
    description:
      "Update your details or delivery preferences here — and you can replay this tour any time from Settings.",
    selector: '[data-tour-id="tour-nav-settings"]',
  },
]

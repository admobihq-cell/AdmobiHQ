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
    type: "primary",
  },
  {
    key: "dashboard",
    title: "Your shift at a glance",
    description:
      "Screen time, distance, busiest areas and times, your latest payout and news from Admobi, all on one page.",
    selector: '[data-tour-id="tour-nav-dashboard"]',
  },
  {
    key: "earnings",
    title: "Every payout, in one place",
    description:
      "Totals for the year, payouts by month, and every payout with its status. Download it as CSV any time.",
    selector: '[data-tour-id="tour-nav-earnings"]',
  },
  {
    key: "reports",
    title: "Your week or month on one page",
    description:
      "Reports adds up your hours logged in, driving and with the screen on, plus distance and pay. Print it or save it as a PDF.",
    selector: '[data-tour-id="tour-nav-reports"]',
  },
  {
    key: "routes",
    title: "Your driving history",
    description:
      "See where you've driven and which routes paid off the most, so you can plan smarter next time.",
    selector: '[data-tour-id="tour-nav-routes"]',
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

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
    title: "Your payout, front and centre",
    description:
      "Home shows your latest payout and where it is on its way to you (Saved, Sending, Paid), plus news from Admobi.",
    selector: '[data-tour-id="tour-nav-dashboard"]',
  },
  {
    key: "earnings",
    title: "Every payout, in one place",
    description:
      "Earnings lists each monthly payout with its status, so you can confirm the money landed.",
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

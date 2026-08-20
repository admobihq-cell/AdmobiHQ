import type { TourChapter } from "@workspace/ui/components/tour-provider"

/**
 * One chapter = one Tour step, anchored to a `data-tour-id` in OpsShell.
 * Ops nav items are permission-gated, so a chapter whose nav item isn't
 * rendered for the current role/permissions simply has no DOM target and
 * is skipped automatically — no per-chapter permission config needed.
 * Kept to the handful of areas every ops staffer touches, not every nav
 * item, so the tour stays a two-minute orientation rather than a slog.
 */
export const opsTourChapters: TourChapter[] = [
  {
    key: "welcome",
    title: "Welcome to the Ops Console",
    description:
      "This is command central for Admobi's fleet and campaign operations. Quick tour, six stops.",
    selector: '[data-tour-id="tour-logo"]',
    placement: "bottomLeft",
    type: "primary",
  },
  {
    key: "home",
    title: "Home",
    description: "Your daily snapshot — what needs attention across drivers, fleet, and campaigns.",
    selector: '[data-tour-id="tour-nav-home"]',
  },
  {
    key: "driver-applications",
    title: "Review driver applications",
    description: "New driver sign-ups land here for verification — approve, reject, or request changes.",
    selector: '[data-tour-id="tour-nav-driver-applications"]',
  },
  {
    key: "fleet",
    title: "Manage fleet partners",
    description: "Track the vehicles and fleet partners carrying Admobi screens.",
    selector: '[data-tour-id="tour-nav-fleet"]',
  },
  {
    key: "finances",
    title: "Keep tabs on finances",
    description: "Payouts, revenue, and financial health across the platform live here.",
    selector: '[data-tour-id="tour-nav-finances"]',
  },
  {
    key: "support",
    title: "Support queue",
    description: "Driver and customer support cases needing a response show up here.",
    selector: '[data-tour-id="tour-nav-support"]',
  },
  {
    key: "settings",
    title: "Platform settings",
    description:
      "Global platform flags and configuration — and you can replay this tour any time from here.",
    selector: '[data-tour-id="tour-nav-settings"]',
  },
]

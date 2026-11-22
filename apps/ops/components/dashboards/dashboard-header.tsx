/** Page headings for the dashboards. Shared by each page and its loading.tsx so the two cannot drift. */
export const DASHBOARD_COPY = {
  overview: {
    title: "Operational overview",
    description: "Operational pulse across leads, fleet, drivers, and signups, and what needs someone.",
  },
  campaigns: {
    title: "Campaigns",
    description: "What is waiting for review, how campaigns are delivering, and what the network has booked.",
  },
  fleet: {
    title: "Fleet",
    description: "Drivers, applications waiting for a decision, and how many vehicles are on the road.",
  },
  advertisers: {
    title: "Advertisers",
    description: "Who is spending, who is new, and which accounts need a conversation.",
  },
  support: {
    title: "Support & safety",
    description: "What people are asking for help with, what has been waiting longest, and open driver safety reports.",
  },
  finances: {
    title: "Finances",
    description: "Money in and out of advertiser wallets, driver payouts and what the platform costs to run.",
  },
} as const

/**
 * `actions` sits at the right, level with the description: a page whose only control is the date
 * range puts it here instead of on a row of its own, which left a band of empty space.
 */
export function DashboardHeader({
  page,
  actions,
}: {
  page: keyof typeof DASHBOARD_COPY
  actions?: React.ReactNode
}) {
  const { title, description } = DASHBOARD_COPY[page]
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dashboards</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

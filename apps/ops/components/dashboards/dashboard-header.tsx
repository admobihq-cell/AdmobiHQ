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

export function DashboardHeader({ page }: { page: keyof typeof DASHBOARD_COPY }) {
  const { title, description } = DASHBOARD_COPY[page]
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dashboards</p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

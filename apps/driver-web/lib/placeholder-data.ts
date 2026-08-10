export const EARNINGS_STATS = [
  {
    label: "This week",
    value: "KES 8,400",
    hint: "Illustrative — not live data",
  },
  {
    label: "Screen-on hours",
    value: "38.5 hrs",
    hint: "Last 7 days",
  },
  {
    label: "Route bonus",
    value: "KES 1,200",
    hint: "Top corridor: CBD Loop",
  },
  {
    label: "Payout status",
    value: "Pending",
    hint: "Next payout: Friday",
  },
] as const

export type DailyEarning = {
  day: string
  amount: number
  hours: number
}

export const DAILY_EARNINGS: DailyEarning[] = [
  { day: "Mon", amount: 1100, hours: 5.2 },
  { day: "Tue", amount: 1350, hours: 6.1 },
  { day: "Wed", amount: 980, hours: 4.4 },
  { day: "Thu", amount: 1600, hours: 7.0 },
  { day: "Fri", amount: 1420, hours: 6.3 },
  { day: "Sat", amount: 1050, hours: 4.8 },
  { day: "Sun", amount: 900, hours: 4.2 },
]

export type RouteSummary = {
  id: string
  name: string
  corridor: string
  hours: string
  earnings: string
  weight: "high" | "medium" | "low"
}

export const ROUTE_HISTORY: RouteSummary[] = [
  {
    id: "1",
    name: "CBD Loop",
    corridor: "Nairobi CBD · 3 corridors",
    hours: "12.4 hrs this week",
    earnings: "KES 2,600",
    weight: "high",
  },
  {
    id: "2",
    name: "Westlands Run",
    corridor: "Westlands · 2 corridors",
    hours: "9.1 hrs this week",
    earnings: "KES 1,850",
    weight: "medium",
  },
  {
    id: "3",
    name: "Mombasa Rd Commute",
    corridor: "Mombasa Rd · 1 corridor",
    hours: "6.0 hrs this week",
    earnings: "KES 980",
    weight: "low",
  },
]

export type RecentActivityItem = {
  id: string
  title: string
  detail: string
  time: string
}

export const RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: "1",
    title: "Route completed — CBD Loop",
    detail: "3.2 hrs screen-on · KES 620 earned",
    time: "Today",
  },
  {
    id: "2",
    title: "Payout scheduled",
    detail: "KES 8,400 for last week's earnings",
    time: "Friday",
  },
  {
    id: "3",
    title: "Route completed — Westlands Run",
    detail: "2.1 hrs screen-on · KES 410 earned",
    time: "Yesterday",
  },
]

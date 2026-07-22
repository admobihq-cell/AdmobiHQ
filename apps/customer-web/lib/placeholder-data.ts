export type CampaignStatus = "active" | "scheduled" | "draft" | "completed"

export type PlaceholderCampaign = {
  id: string
  name: string
  status: CampaignStatus
  market: string
  dates: string
  impressions: string
  budget: string
}

export const PLACEHOLDER_CAMPAIGNS: PlaceholderCampaign[] = [
  {
    id: "1",
    name: "Nairobi CBD Summer",
    status: "active",
    market: "CBD · 4 corridors",
    dates: "Jun 1 – Aug 31",
    impressions: "482k",
    budget: "KES 180k",
  },
  {
    id: "2",
    name: "Westlands Retail Push",
    status: "active",
    market: "Westlands · 3 corridors",
    dates: "Jul 1 – Sep 15",
    impressions: "318k",
    budget: "KES 145k",
  },
  {
    id: "3",
    name: "Karen Estate Awareness",
    status: "scheduled",
    market: "Karen · 6 corridors",
    dates: "Starts Aug 4",
    impressions: "—",
    budget: "KES 95k",
  },
  {
    id: "4",
    name: "Mombasa Rd Commute",
    status: "draft",
    market: "Mombasa Rd · 2 corridors",
    dates: "Not scheduled",
    impressions: "—",
    budget: "KES 60k",
  },
]

export const RECENT_ACTIVITY = [
  {
    id: "1",
    title: "Westlands Retail Push",
    detail: "Delivery reached 92% of weekly target",
    time: "2h ago",
  },
  {
    id: "2",
    title: "CBD Summer Flight",
    detail: "18 new proof-of-play events recorded",
    time: "5h ago",
  },
  {
    id: "3",
    title: "Karen Estate Awareness",
    detail: "Scheduled to start Monday · 6 corridors",
    time: "Yesterday",
  },
] as const

export const OVERVIEW_STATS = [
  {
    label: "Active campaigns",
    value: "3",
    hint: "+1 this week",
  },
  {
    label: "Impressions",
    value: "1.2M",
    hint: "Last 30 days",
  },
  {
    label: "Delivery rate",
    value: "84%",
    hint: "On target",
  },
  {
    label: "Spend",
    value: "KES 420k",
    hint: "Month to date",
  },
] as const

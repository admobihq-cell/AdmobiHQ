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

export type WalletTransaction = {
  id: string
  label: string
  meta: string
  amount: number
  kind: "credit" | "debit"
}

export const WALLET_BALANCE = 18400
export const WALLET_LOW_BALANCE_THRESHOLD = 20000

export const WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "1",
    label: "Wallet top-up · M-Pesa",
    meta: "Today, 9:14 AM",
    amount: 50000,
    kind: "credit",
  },
  {
    id: "2",
    label: "Nairobi CBD Summer — daily spend",
    meta: "Today",
    amount: 6200,
    kind: "debit",
  },
  {
    id: "3",
    label: "Westlands Retail Push — daily spend",
    meta: "Yesterday",
    amount: 4800,
    kind: "debit",
  },
  {
    id: "4",
    label: "Wallet top-up · Visa •• 4821",
    meta: "3 days ago",
    amount: 30000,
    kind: "credit",
  },
  {
    id: "5",
    label: "Karen Estate Awareness — daily spend",
    meta: "4 days ago",
    amount: 3100,
    kind: "debit",
  },
]

export const SPEND_BY_CAMPAIGN = [
  { id: "1", name: "Nairobi CBD Summer", spend: 62400 },
  { id: "2", name: "Westlands Retail Push", spend: 41200 },
  { id: "3", name: "Karen Estate Awareness", spend: 12300 },
]

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

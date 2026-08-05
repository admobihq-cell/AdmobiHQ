// Local-only campaign storage — mirrors apps/customer-mobile/lib/campaigns.ts
// so the web and mobile experiences match. Nothing here reaches a real
// backend; campaigns created here live in this browser's localStorage only.

import type { CampaignStatus } from "@/lib/placeholder-data"
import { formatCurrency } from "@/lib/wallet"

export type CampaignFormat = "taxi_top" | "delivery_bike" | "both"

export type Campaign = {
  id: string
  name: string
  status: CampaignStatus
  market: string
  dates: string
  impressions: string
  budget: string
  format: CampaignFormat
  /** True for campaigns created in this browser, false for the seeded examples. */
  createdLocally: boolean
}

const STORAGE_KEY = "admobi.customer.campaigns"

const FORMAT_LABELS: Record<CampaignFormat, string> = {
  taxi_top: "Taxi-top LED",
  delivery_bike: "Delivery bike",
  both: "Taxi-top LED + delivery bike",
}

export function formatLabelFor(format: CampaignFormat): string {
  return FORMAT_LABELS[format]
}

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: "seed-1",
    name: "Nairobi CBD Summer",
    status: "active",
    market: "CBD · 4 corridors",
    dates: "Jun 1 – Aug 31",
    impressions: "482k",
    budget: "KES 180,000",
    format: "taxi_top",
    createdLocally: false,
  },
  {
    id: "seed-2",
    name: "Westlands Retail Push",
    status: "active",
    market: "Westlands · 3 corridors",
    dates: "Jul 1 – Sep 15",
    impressions: "318k",
    budget: "KES 145,000",
    format: "both",
    createdLocally: false,
  },
  {
    id: "seed-3",
    name: "Karen Estate Awareness",
    status: "scheduled",
    market: "Karen · 6 corridors",
    dates: "Starts Aug 4",
    impressions: "—",
    budget: "KES 95,000",
    format: "taxi_top",
    createdLocally: false,
  },
  {
    id: "seed-4",
    name: "Mombasa Rd Commute",
    status: "draft",
    market: "Mombasa Rd · 2 corridors",
    dates: "Not scheduled",
    impressions: "—",
    budget: "KES 60,000",
    format: "delivery_bike",
    createdLocally: false,
  },
]

let cache: Campaign[] | null = null

function readAll(): Campaign[] {
  if (cache) return cache
  if (typeof window === "undefined") return SEED_CAMPAIGNS
  const raw = window.localStorage.getItem(STORAGE_KEY)
  cache = raw ? (JSON.parse(raw) as Campaign[]) : SEED_CAMPAIGNS
  return cache
}

function writeAll(campaigns: Campaign[]) {
  cache = campaigns
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
  }
}

export function getCampaigns(): Campaign[] {
  return readAll()
}

export function getCampaignById(id: string): Campaign | null {
  return readAll().find((campaign) => campaign.id === id) ?? null
}

export function createCampaign(input: {
  name: string
  market: string
  format: CampaignFormat
  budgetKes: number
  duration: string
}): Campaign {
  const all = readAll()
  const campaign: Campaign = {
    id: `local-${Date.now()}`,
    name: input.name,
    status: "draft",
    market: input.market,
    dates: input.duration,
    impressions: "—",
    budget: formatCurrency(input.budgetKes),
    format: input.format,
    createdLocally: true,
  }
  writeAll([campaign, ...all])
  return campaign
}

import AsyncStorage from "@react-native-async-storage/async-storage"

import type { CampaignStatus } from "@/components/ui/status-badge"
import {
  endsOnFromDuration,
  formatFlightDates,
  isFlightDuration,
  parseDisplayDates,
  type FlightDuration,
} from "@/lib/campaign-calendar"
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
  /** Inclusive flight start, `YYYY-MM-DD`. Absent/null when the campaign is unscheduled. */
  startsOn?: string | null
  /** Inclusive flight end, `YYYY-MM-DD`. */
  endsOn?: string | null
  /** True for campaigns created on-device (this demo/app instance), false for the seeded examples. */
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
    startsOn: "2026-06-01",
    endsOn: "2026-08-31",
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
    startsOn: "2026-07-01",
    endsOn: "2026-09-15",
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
    startsOn: "2026-08-04",
    endsOn: "2026-09-03",
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
    startsOn: null,
    endsOn: null,
    createdLocally: false,
  },
]

let cache: Campaign[] | null = null

/** Backfill structured flight dates from the legacy display string when possible. */
function hydrateCampaign(campaign: Campaign): Campaign {
  if (campaign.startsOn && campaign.endsOn) return campaign
  const parsed = parseDisplayDates(campaign.dates)
  if (!parsed) return campaign
  return { ...campaign, startsOn: parsed.startsOn, endsOn: parsed.endsOn }
}

async function readAll(): Promise<Campaign[]> {
  if (cache) return cache
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  const parsed = raw ? (JSON.parse(raw) as Campaign[]) : SEED_CAMPAIGNS
  cache = parsed.map(hydrateCampaign)
  return cache
}

async function writeAll(campaigns: Campaign[]) {
  cache = campaigns
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
}

export async function getCampaigns(): Promise<Campaign[]> {
  return readAll()
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const all = await readAll()
  return all.find((campaign) => campaign.id === id) ?? null
}

export async function createCampaign(input: {
  name: string
  market: string
  format: CampaignFormat
  budgetKes: number
  duration: string
  startsOn?: string | null
  endsOn?: string | null
}): Promise<Campaign> {
  const all = await readAll()
  const startsOn = input.startsOn || null
  const endsOn =
    input.endsOn ||
    (startsOn && isFlightDuration(input.duration)
      ? endsOnFromDuration(startsOn, input.duration)
      : null)
  const dates = startsOn && endsOn ? formatFlightDates(startsOn, endsOn) : input.duration
  const campaign: Campaign = {
    id: `local-${Date.now()}`,
    name: input.name,
    status: startsOn ? "scheduled" : "draft",
    market: input.market,
    dates,
    impressions: "—",
    budget: formatCurrency(input.budgetKes),
    format: input.format,
    startsOn,
    endsOn,
    createdLocally: true,
  }
  await writeAll([campaign, ...all])
  return campaign
}

/** Place an unscheduled draft on a start day, defaulting its length by duration. */
export async function scheduleCampaign(
  id: string,
  startsOn: string,
  duration: FlightDuration = "1 week",
): Promise<Campaign | null> {
  const all = await readAll()
  const index = all.findIndex((campaign) => campaign.id === id)
  if (index < 0) return null
  const current = all[index]!
  const endsOn = endsOnFromDuration(startsOn, duration)
  const next: Campaign = {
    ...current,
    startsOn,
    endsOn,
    dates: formatFlightDates(startsOn, endsOn),
    status: current.status === "draft" ? "scheduled" : current.status,
  }
  const updated = [...all]
  updated[index] = next
  await writeAll(updated)
  return next
}

/** Move or resize an existing flight window to an explicit start/end. */
export async function rescheduleCampaign(
  id: string,
  startsOn: string,
  endsOn: string,
): Promise<Campaign | null> {
  const all = await readAll()
  const index = all.findIndex((campaign) => campaign.id === id)
  if (index < 0) return null
  const current = all[index]!
  const next: Campaign = {
    ...current,
    startsOn,
    endsOn,
    dates: formatFlightDates(startsOn, endsOn),
    status: current.status === "draft" ? "scheduled" : current.status,
  }
  const updated = [...all]
  updated[index] = next
  await writeAll(updated)
  return next
}

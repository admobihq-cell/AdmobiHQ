export const PRICING_DISCLAIMER =
  "Indicative pricing only, modelled on Admobi's spot/play rate card. Final rates are confirmed per brief, corridor, and loop capacity when you start a campaign."

export const PRICING_MODEL_NAME = "Spot/play pricing"

/** KES per play, per screen, at the 10-second reference slot. Illustrative until reverse-engineered from real loop length and sellable inventory. */
export const BASE_PRICE_PER_PLAY_KES = 8

export const REFERENCE_SLOT_SECONDS = 10

export type SlotLengthOption = {
  seconds: number
  label: string
  multiplier: number
}

/** Sub-linear: a 60s ad plays roughly 2.5x a 10s ad, not 6x — attention doesn't scale 1:1 with duration. */
export const slotLengthOptions: readonly SlotLengthOption[] = [
  { seconds: 10, label: "10s", multiplier: 1.0 },
  { seconds: 15, label: "15s", multiplier: 1.3 },
  { seconds: 30, label: "30s", multiplier: 1.8 },
  { seconds: 60, label: "60s", multiplier: 2.5 },
] as const

export type ZoneTier = {
  id: string
  name: string
  multiplier: number
  examples: readonly string[]
  description: string
}

export const zoneTiers: readonly ZoneTier[] = [
  {
    id: "community",
    name: "Community zones",
    multiplier: 1.0,
    examples: ["Kibera", "Kayole", "Dandora", "Umoja", "Eastlands"],
    description: "High-density estates and last-mile corridors. The base rate.",
  },
  {
    id: "premium",
    name: "Premium estates",
    multiplier: 1.5,
    examples: ["Kilimani", "Lavington", "Westlands", "Kileleshwa", "Hurlingham"],
    description: "Established commercial and residential hubs with heavier daytime traffic.",
  },
  {
    id: "elite",
    name: "Elite corridors",
    multiplier: 2.0,
    examples: ["CBD", "Karen", "Gigiri", "Airport Road / JKIA corridor"],
    description: "Nairobi's commercial core plus diplomatic and airport routes.",
  },
] as const

/** Booking every zone at once, no corridor picked. Priced above the simple average of the three zone tiers as an access premium for full-network reach. */
export const allScreensFlatMultiplier = 1.6

export type VolumeTier = {
  minScreens: number
  maxScreens: number | null
  multiplier: number
  label: string
}

export const volumeTiers: readonly VolumeTier[] = [
  { minScreens: 1, maxScreens: 9, multiplier: 1.0, label: "1–9 screens" },
  { minScreens: 10, maxScreens: 49, multiplier: 0.9, label: "10–49 screens" },
  { minScreens: 50, maxScreens: null, multiplier: 0.8, label: "50+ screens" },
] as const

export function getVolumeTier(screens: number): VolumeTier {
  return (
    volumeTiers.find(
      (tier) => screens >= tier.minScreens && (tier.maxScreens === null || screens <= tier.maxScreens),
    ) ?? volumeTiers[0]!
  )
}

export function getSlotMultiplier(seconds: number): number {
  return slotLengthOptions.find((option) => option.seconds === seconds)?.multiplier ?? 1.0
}

export type SimulatorInput = {
  screens: number
  slotSeconds: number
  zoneMultiplier: number
  playsPerDay: number
  days: number
}

export type SimulatorResult = {
  pricePerPlay: number
  pricePerScreenPerDay: number
  totalPerDay: number
  total: number
  slotMultiplier: number
  volumeTier: VolumeTier
}

export function calculateSimulatorPrice(input: SimulatorInput): SimulatorResult {
  const slotMultiplier = getSlotMultiplier(input.slotSeconds)
  const volumeTier = getVolumeTier(input.screens)
  const pricePerPlay = BASE_PRICE_PER_PLAY_KES * slotMultiplier * input.zoneMultiplier * volumeTier.multiplier
  const pricePerScreenPerDay = pricePerPlay * input.playsPerDay
  const totalPerDay = pricePerScreenPerDay * input.screens
  const total = totalPerDay * input.days

  return { pricePerPlay, pricePerScreenPerDay, totalPerDay, total, slotMultiplier, volumeTier }
}

export type PlanTier = {
  id: string
  name: string
  tagline: string
  description: string
  bullets: readonly string[]
  priceNote: string
  cta: "quote" | "simulate"
}

export const planTiers: readonly PlanTier[] = [
  {
    id: "zone-select",
    name: "Zone select",
    tagline: "Pick your corridors",
    description:
      "Book Community, Premium, or Elite zones by name. Pay only for the traffic your brief actually needs.",
    bullets: [
      "Choose from Community, Premium, and Elite multipliers",
      "Mix zones across a single campaign",
      "Best for launches with a defined target audience or neighbourhood",
    ],
    priceNote: `From ${formatKes(BASE_PRICE_PER_PLAY_KES)} / play at Community rate`,
    cta: "simulate",
  },
  {
    id: "all-screens",
    name: "All screens",
    tagline: "One flat citywide rate",
    description:
      "Skip zone selection. Your ad plays across every Admobi screen in the network, Community through Elite, at a single blended rate.",
    bullets: [
      `Flat ${allScreensFlatMultiplier}x rate regardless of corridor`,
      "Simplest setup for city-wide brand pushes",
      "No per-zone accounting on your invoice",
    ],
    priceNote: `Flat ${allScreensFlatMultiplier}x multiplier, any screen`,
    cta: "simulate",
  },
  {
    id: "enterprise",
    name: "Enterprise & exclusivity",
    tagline: "Custom-negotiated books",
    description:
      "Category exclusivity, corridor exclusivity, fleet-wide 50+ screen deals, and multi-city rollouts. Priced on brief.",
    bullets: [
      "Corridor or category exclusivity",
      "50+ screen fleet commitments with dedicated pacing",
      "Multi-city rollout and creative production support",
    ],
    priceNote: "Quoted on brief",
    cta: "quote",
  },
] as const

/**
 * Bike enclosures are static (non-digital), so there's no "play" to rotate — a booked side is
 * exclusively the advertiser's for the whole flight. Priced per side, per bike, per day instead
 * of per play. Illustrative, back-calculated to roughly match the legacy flat "weekly flight"
 * package (KES 180,000 / 7 days) at a 20-bike, 1-side, Community-zone default — pending real
 * reverse-engineering from dispatch route counts, same caveat as BASE_PRICE_PER_PLAY_KES.
 */
export const BASE_BIKE_SIDE_DAY_KES = 1_400

export type BikeSidesOption = {
  sides: 1 | 2 | 3
  label: string
  multiplier: number
}

/** Sub-linear like slot length: a full 3-side wrap reads far more than 3x a single side, but doesn't cost 3x — bundling more of one bike is priced at a discount. */
export const bikeSidesOptions: readonly BikeSidesOption[] = [
  { sides: 1, label: "1 side", multiplier: 1.0 },
  { sides: 2, label: "2 sides", multiplier: 1.85 },
  { sides: 3, label: "3 sides (full wrap)", multiplier: 2.5 },
] as const

export function getSidesMultiplier(sides: number): number {
  return bikeSidesOptions.find((option) => option.sides === sides)?.multiplier ?? 1.0
}

export type BikeSimulatorInput = {
  bikes: number
  sides: number
  zoneMultiplier: number
  days: number
}

export type BikeSimulatorResult = {
  pricePerSidePerDay: number
  pricePerBikePerDay: number
  totalPerDay: number
  total: number
  sidesMultiplier: number
  volumeTier: VolumeTier
}

export function calculateBikeSimulatorPrice(input: BikeSimulatorInput): BikeSimulatorResult {
  const sidesMultiplier = getSidesMultiplier(input.sides)
  const volumeTier = getVolumeTier(input.bikes)
  const pricePerSidePerDay = BASE_BIKE_SIDE_DAY_KES * input.zoneMultiplier * volumeTier.multiplier
  const pricePerBikePerDay = pricePerSidePerDay * sidesMultiplier
  const totalPerDay = pricePerBikePerDay * input.bikes
  const total = totalPerDay * input.days

  return { pricePerSidePerDay, pricePerBikePerDay, totalPerDay, total, sidesMultiplier, volumeTier }
}

export function formatKes(amount: number): string {
  const rounded = Math.round(amount)
  return `KES ${rounded.toLocaleString("en-KE")}`
}

export function formatKesPrecise(amount: number, maximumFractionDigits = 2): string {
  return `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits })}`
}

// ---------------------------------------------------------------------------
// Campaign-side pricing
//
// The two simulators above are the marketing site's shape: a visitor picks a
// zone and a model by hand. A campaign already knows both — the advertiser
// chose a market and a format in the wizard's first step — so this section
// derives what it can and prices the *campaign*, not a hypothetical.
// ---------------------------------------------------------------------------

/**
 * The markets the campaign wizard offers, mapped onto rate-card zones.
 *
 * Keyed off the wizard's own MARKETS list rather than the zone `examples`
 * copy: the examples exist to illustrate a tier on the pricing page and can be
 * reworded freely, whereas this mapping decides what someone is charged.
 * Mombasa Rd sits at premium — a major arterial corridor, but not the CBD /
 * Karen / Gigiri tier the elite multiplier is reserved for.
 */
export const marketZoneIds: Record<string, ZoneTier["id"]> = {
  CBD: "elite",
  Karen: "elite",
  Westlands: "premium",
  Kilimani: "premium",
  "Mombasa Rd": "premium",
  Eastlands: "community",
}

/** The zone tier a market bills at. Falls back to community — the base rate —
 * so an unmapped or not-yet-picked market never silently over-quotes. */
export function zoneForMarket(market: string | null | undefined): ZoneTier {
  const id = market ? marketZoneIds[market] : undefined
  return zoneTiers.find((zone) => zone.id === id) ?? zoneTiers[0]!
}

export type CampaignEstimateInput = {
  /** "taxi_top" | "delivery_bike" | "both" — the campaign's format. */
  format: string
  zoneMultiplier: number
  days: number
  /** Taxi-top side, ignored for a delivery_bike-only campaign. */
  screens: number
  slotSeconds: number
  playsPerDay: number
  /** Delivery-bike side, ignored for a taxi_top-only campaign. */
  bikes: number
  sides: number
}

export type CampaignEstimate = {
  /** Present only for the formats that actually run on that panel. */
  screen: SimulatorResult | null
  bike: BikeSimulatorResult | null
  total: number
}

/**
 * Prices a campaign against the panels it actually books.
 *
 * The two panels are priced by genuinely different models — a taxi-top LED
 * sells rotations of a loop (per play), while a bike enclosure is static and
 * sells a side outright for the flight (per side, per day) — so quoting a
 * delivery-bike campaign off the per-play rate would be wrong, not merely
 * imprecise. A "both" campaign is the sum of the two, because it books both
 * pieces of hardware.
 */
export function calculateCampaignEstimate(input: CampaignEstimateInput): CampaignEstimate {
  const wantsScreens = input.format === "taxi_top" || input.format === "both"
  const wantsBikes = input.format === "delivery_bike" || input.format === "both"

  const screen = wantsScreens
    ? calculateSimulatorPrice({
        screens: input.screens,
        slotSeconds: input.slotSeconds,
        zoneMultiplier: input.zoneMultiplier,
        playsPerDay: input.playsPerDay,
        days: input.days,
      })
    : null

  const bike = wantsBikes
    ? calculateBikeSimulatorPrice({
        bikes: input.bikes,
        sides: input.sides,
        zoneMultiplier: input.zoneMultiplier,
        days: input.days,
      })
    : null

  return { screen, bike, total: (screen?.total ?? 0) + (bike?.total ?? 0) }
}

/** Inclusive flight length from two `YYYY-MM-DD` strings — a one-day flight is
 * 1 day, not 0. Zero when the window isn't picked yet or is inverted, which
 * the estimators read as "let the advertiser set the length themselves". */
export function flightDaysBetween(startsOn: string, endsOn: string): number {
  if (!startsOn || !endsOn || endsOn < startsOn) return 0
  const ms = Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)
  if (Number.isNaN(ms)) return 0
  return Math.round(ms / 86_400_000) + 1
}

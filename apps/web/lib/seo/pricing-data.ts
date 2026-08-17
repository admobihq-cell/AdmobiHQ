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

export type LegacyPricingTier = {
  id: string
  name: string
  startingFromKes: number
  duration: string
  geography: string
  includes: readonly string[]
  notes?: string
}

/** Delivery bike enclosures are static (non-digital) inventory, so the spot/play formula does not apply — kept as starting-from flight pricing. */
export const deliveryBikeTiers: readonly LegacyPricingTier[] = [
  {
    id: "bike-week-estate",
    name: "Delivery bike weekly flight",
    startingFromKes: 180_000,
    duration: "7 days",
    geography: "Estate and last-mile clusters in Nairobi",
    includes: [
      "Bike enclosure inventory on dispatch routes",
      "Same creative gates as taxi-top units",
      "GPS-verified play reporting",
    ],
  },
  {
    id: "bike-month-sustained",
    name: "Delivery bike sustained book",
    startingFromKes: 620_000,
    duration: "28 days",
    geography: "Multiple Nairobi estate corridors",
    includes: [
      "Lunch-hour and e-commerce peak targeting",
      "Combined reporting with taxi-top optional",
    ],
  },
] as const

export function formatKes(amount: number): string {
  const rounded = Math.round(amount)
  return `KES ${rounded.toLocaleString("en-KE")}`
}

export function formatKesPrecise(amount: number, maximumFractionDigits = 2): string {
  return `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits })}`
}

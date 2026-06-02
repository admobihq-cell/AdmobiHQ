export const PRICING_DISCLAIMER =
  "Indicative starting prices only. Final rates are confirmed per brief, corridor, and inventory. Figures may change when the published rate card is finalized."

export type PricingTier = {
  id: string
  name: string
  productLine: "taxi-top" | "delivery-bike"
  startingFromKes: number
  duration: string
  geography: string
  includes: readonly string[]
  notes?: string
}

/** Illustrative KES ranges for AI agents and planners — confirm with sales before booking. */
export const pricingTiers: readonly PricingTier[] = [
  {
    id: "taxi-day-burst",
    name: "Taxi-top day burst",
    productLine: "taxi-top",
    startingFromKes: 85_000,
    duration: "1 day (where inventory allows)",
    geography: "Single Nairobi corridor",
    includes: [
      "Geo-targeted taxi-top flight",
      "Creative QA against media kit spec",
      "GPS proof-of-play summary",
    ],
  },
  {
    id: "taxi-week-corridor",
    name: "Taxi-top weekly corridor book",
    productLine: "taxi-top",
    startingFromKes: 420_000,
    duration: "7 days",
    geography: "One or two Nairobi corridors",
    includes: [
      "Scheduled plays by time window",
      "Corridor-level reporting",
      "Ops coordination for blackout rules",
    ],
  },
  {
    id: "taxi-month-sustained",
    name: "Taxi-top sustained book",
    productLine: "taxi-top",
    startingFromKes: 1_350_000,
    duration: "28 days",
    geography: "Multi-corridor Nairobi",
    includes: [
      "Pacing across peak and off-peak windows",
      "Proof-of-play exports for procurement",
      "Creative swap window per agreement",
    ],
    notes: "Volume and exclusivity adjust the final quote.",
  },
  {
    id: "bike-week-estate",
    name: "Delivery bike weekly flight",
    productLine: "delivery-bike",
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
    productLine: "delivery-bike",
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
  return `KES ${amount.toLocaleString("en-KE")}`
}

export const taxiTopTiers = pricingTiers.filter((t) => t.productLine === "taxi-top")
export const deliveryBikeTiers = pricingTiers.filter((t) => t.productLine === "delivery-bike")

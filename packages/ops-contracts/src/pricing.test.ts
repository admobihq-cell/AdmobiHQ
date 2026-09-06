import { describe, expect, it } from "vitest"

import {
  BASE_BIKE_SIDE_DAY_KES,
  BASE_PRICE_PER_PLAY_KES,
  calculateCampaignEstimate,
  flightDaysBetween,
  marketZoneIds,
  zoneForMarket,
} from "./pricing"

/** The wizard's market list, duplicated here on purpose: if someone adds a
 * market to the wizard without pricing it, this test is what says so. */
const WIZARD_MARKETS = ["CBD", "Westlands", "Karen", "Kilimani", "Mombasa Rd", "Eastlands"]

const base = {
  zoneMultiplier: 1,
  days: 10,
  screens: 20,
  slotSeconds: 15,
  playsPerDay: 20,
  bikes: 20,
  sides: 1,
}

describe("zoneForMarket", () => {
  it("prices every market the wizard offers", () => {
    for (const market of WIZARD_MARKETS) {
      expect(marketZoneIds[market], `${market} has no zone`).toBeDefined()
    }
    expect(Object.keys(marketZoneIds).sort()).toEqual([...WIZARD_MARKETS].sort())
  })

  it("maps markets onto the tier their examples belong to", () => {
    expect(zoneForMarket("CBD").id).toBe("elite")
    expect(zoneForMarket("Kilimani").id).toBe("premium")
    expect(zoneForMarket("Eastlands").id).toBe("community")
  })

  it("falls back to the base rate rather than over-quoting an unknown market", () => {
    expect(zoneForMarket(null).multiplier).toBe(1)
    expect(zoneForMarket("Atlantis").multiplier).toBe(1)
    expect(zoneForMarket(undefined).id).toBe("community")
  })
})

describe("calculateCampaignEstimate", () => {
  it("prices a taxi-top campaign on the per-play model only", () => {
    const estimate = calculateCampaignEstimate({ ...base, format: "taxi_top" })
    expect(estimate.bike).toBeNull()
    expect(estimate.screen).not.toBeNull()
    // 8 base x 1.3 (15s) x 1.0 zone x 0.9 volume (20 screens) = 9.36 per play
    expect(estimate.screen!.pricePerPlay).toBeCloseTo(BASE_PRICE_PER_PLAY_KES * 1.3 * 0.9)
    expect(estimate.total).toBe(estimate.screen!.total)
  })

  it("prices a delivery-bike campaign on the per-side-per-day model, not per play", () => {
    const estimate = calculateCampaignEstimate({ ...base, format: "delivery_bike" })
    expect(estimate.screen).toBeNull()
    expect(estimate.bike).not.toBeNull()
    expect(estimate.bike!.pricePerSidePerDay).toBeCloseTo(BASE_BIKE_SIDE_DAY_KES * 0.9)
    expect(estimate.total).toBe(estimate.bike!.total)

    // The whole point of the split: the two models must not agree by accident.
    const screens = calculateCampaignEstimate({ ...base, format: "taxi_top" })
    expect(estimate.total).not.toBeCloseTo(screens.total)
  })

  it("sums both panels for a 'both' campaign, because it books both", () => {
    const both = calculateCampaignEstimate({ ...base, format: "both" })
    const screens = calculateCampaignEstimate({ ...base, format: "taxi_top" })
    const bikes = calculateCampaignEstimate({ ...base, format: "delivery_bike" })

    expect(both.screen).not.toBeNull()
    expect(both.bike).not.toBeNull()
    expect(both.total).toBeCloseTo(screens.total + bikes.total)
  })

  it("scales with the zone multiplier the market resolves to", () => {
    const community = calculateCampaignEstimate({
      ...base,
      format: "both",
      zoneMultiplier: zoneForMarket("Eastlands").multiplier,
    })
    const elite = calculateCampaignEstimate({
      ...base,
      format: "both",
      zoneMultiplier: zoneForMarket("CBD").multiplier,
    })
    expect(elite.total).toBeCloseTo(community.total * 2)
  })

  it("is zero for a zero-day flight, on every format", () => {
    for (const format of ["taxi_top", "delivery_bike", "both"]) {
      expect(calculateCampaignEstimate({ ...base, format, days: 0 }).total).toBe(0)
    }
  })
})

describe("flightDaysBetween", () => {
  it("counts inclusively", () => {
    expect(flightDaysBetween("2026-10-01", "2026-10-01")).toBe(1)
    expect(flightDaysBetween("2026-10-01", "2026-10-05")).toBe(5)
  })

  it("counts across a month and a year boundary", () => {
    expect(flightDaysBetween("2026-01-30", "2026-02-02")).toBe(4)
    expect(flightDaysBetween("2026-12-30", "2027-01-02")).toBe(4)
  })

  it("is zero when the window is missing or inverted", () => {
    expect(flightDaysBetween("", "2026-10-05")).toBe(0)
    expect(flightDaysBetween("2026-10-05", "")).toBe(0)
    expect(flightDaysBetween("2026-10-05", "2026-10-01")).toBe(0)
  })
})

import { describe, expect, it } from "vitest"

import {
  CUSTOMER_BOOKED_CORRIDOR_IDS,
  DEFAULT_BASEMAP,
  NAIROBI_CENTER,
  NAIROBI_CORRIDORS,
  getCustomerBookedCorridors,
  getCustomerPlayPoints,
  resolveBasemapStyleUrl,
} from "./index"

describe("nairobi geo data", () => {
  it("uses Nairobi CBD as the map center", () => {
    expect(NAIROBI_CENTER).toEqual([36.8172, -1.2864])
  })

  it("exposes named commute corridors", () => {
    expect(NAIROBI_CORRIDORS.length).toBeGreaterThanOrEqual(4)
    expect(NAIROBI_CORRIDORS.map((c) => c.id)).toEqual(
      expect.arrayContaining(["mombasa-rd", "thika-rd", "waiyaki-way", "langata-rd"]),
    )
  })

  it("returns only booked corridors for the customer map", () => {
    const booked = getCustomerBookedCorridors()
    expect(booked.map((c) => c.id)).toEqual([...CUSTOMER_BOOKED_CORRIDOR_IDS])
    expect(booked.every((c) => c.coordinates.length >= 2)).toBe(true)
  })

  it("filters play points to booked corridors", () => {
    const plays = getCustomerPlayPoints()
    const booked = new Set<string>(CUSTOMER_BOOKED_CORRIDOR_IDS)
    expect(plays.type).toBe("FeatureCollection")
    expect(plays.features.length).toBeGreaterThan(0)
    expect(
      plays.features.every((f) => booked.has(f.properties.corridorId)),
    ).toBe(true)
  })
})

describe("map theme", () => {
  it("defaults to the clean basemap", () => {
    expect(DEFAULT_BASEMAP).toBe("clean")
  })

  it("resolves light and dark style URLs", () => {
    const light = resolveBasemapStyleUrl("clean", false)
    const dark = resolveBasemapStyleUrl("clean", true)
    expect(light).toContain("positron")
    expect(dark).toContain("dark-matter")
    expect(light).not.toBe(dark)
  })
})

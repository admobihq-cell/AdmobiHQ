import { describe, expect, it } from "vitest"

import { flightPhase, toDayIso } from "./campaign-dto"
import { missingCampaignCreatives, missingCampaignFields } from "./campaign-store"

/** A Prisma `@db.Date` value: UTC midnight of that calendar day. */
function dbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

/** A wall-clock "now" with a real time of day, deliberately mid-afternoon so a
 * local-vs-UTC getter mix-up would show up as an off-by-one day. */
function at(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y!, m! - 1, d!, 14, 30)
}

describe("toDayIso", () => {
  it("reads a UTC-midnight date column as its own calendar day", () => {
    expect(toDayIso(dbDate("2026-09-06"))).toBe("2026-09-06")
    expect(toDayIso(dbDate("2026-01-01"))).toBe("2026-01-01")
    expect(toDayIso(dbDate("2026-12-31"))).toBe("2026-12-31")
  })

  it("zero-pads single-digit months and days", () => {
    expect(toDayIso(dbDate("2026-03-07"))).toBe("2026-03-07")
  })
})

describe("flightPhase", () => {
  const start = dbDate("2026-10-01")
  const end = dbDate("2026-10-31")

  it("is unscheduled for anything not approved, whatever the dates say", () => {
    for (const status of ["draft", "submitted", "rejected", "changes_requested", "cancelled"]) {
      expect(flightPhase(status, start, end, at("2026-10-15"))).toBe("unscheduled")
    }
  })

  it("is unscheduled when approved but undated", () => {
    expect(flightPhase("approved", null, null, at("2026-10-15"))).toBe("unscheduled")
    expect(flightPhase("approved", start, null, at("2026-10-15"))).toBe("unscheduled")
    expect(flightPhase("approved", null, end, at("2026-10-15"))).toBe("unscheduled")
  })

  it("is scheduled before the window opens", () => {
    expect(flightPhase("approved", start, end, at("2026-09-30"))).toBe("scheduled")
    expect(flightPhase("approved", start, end, at("2026-01-01"))).toBe("scheduled")
  })

  it("is live on the first day, mid-window, and on the last day", () => {
    // Both boundaries are inclusive — a one-day flight must actually run.
    expect(flightPhase("approved", start, end, at("2026-10-01"))).toBe("live")
    expect(flightPhase("approved", start, end, at("2026-10-15"))).toBe("live")
    expect(flightPhase("approved", start, end, at("2026-10-31"))).toBe("live")
  })

  it("is completed the day after the window closes", () => {
    expect(flightPhase("approved", start, end, at("2026-11-01"))).toBe("completed")
    expect(flightPhase("approved", start, end, at("2027-05-01"))).toBe("completed")
  })

  it("runs a single-day flight", () => {
    const day = dbDate("2026-10-01")
    expect(flightPhase("approved", day, day, at("2026-09-30"))).toBe("scheduled")
    expect(flightPhase("approved", day, day, at("2026-10-01"))).toBe("live")
    expect(flightPhase("approved", day, day, at("2026-10-02"))).toBe("completed")
  })

  it("treats late-evening local time as still the same day", () => {
    const [y, m, d] = [2026, 10, 31]
    const lateOnLastDay = new Date(y, m - 1, d, 23, 45)
    expect(flightPhase("approved", start, end, lateOnLastDay)).toBe("live")
  })
})

describe("missingCampaignFields", () => {
  const complete = {
    name: "Kilimani Launch",
    market: "Kilimani",
    format: "taxi_top",
    budget_kes: { toString: () => "120000" },
    starts_on: dbDate("2026-10-01"),
    ends_on: dbDate("2026-10-31"),
  } as never

  it("passes a complete campaign", () => {
    expect(missingCampaignFields(complete)).toEqual([])
  })

  it("names every missing field on an empty draft", () => {
    const empty = {
      name: "",
      market: null,
      format: "taxi_top",
      budget_kes: null,
      starts_on: null,
      ends_on: null,
    } as never
    expect(missingCampaignFields(empty)).toEqual([
      "name",
      "market",
      "budget_kes",
      "starts_on",
      "ends_on",
    ])
  })

  it("treats a whitespace-only name as missing", () => {
    expect(missingCampaignFields({ ...(complete as object), name: "   " } as never)).toEqual([
      "name",
    ])
  })

  it("accepts a zero budget as present, since 0 is a value and not an absence", () => {
    // Guards against a truthiness check creeping in: `!0` is true.
    const free = { ...(complete as object), budget_kes: { toString: () => "0" } } as never
    expect(missingCampaignFields(free)).toEqual([])
  })

  it("does not require objective, corridors, notes, or contact details", () => {
    const sparse = {
      ...(complete as object),
      objective: null,
      corridors: null,
      notes: null,
      contact_name: null,
      contact_email: null,
    } as never
    expect(missingCampaignFields(sparse)).toEqual([])
  })
})

describe("missingCampaignCreatives", () => {
  const taxiArt = { width: 960, height: 320 } as never
  const bikeArt = { width: 320, height: 320 } as never

  it("requires at least one creative", () => {
    expect(missingCampaignCreatives("taxi_top", [])).toEqual(["Taxi-top LED"])
  })

  it("accepts artwork matching the panel", () => {
    expect(missingCampaignCreatives("taxi_top", [taxiArt])).toEqual([])
    expect(missingCampaignCreatives("delivery_bike", [bikeArt])).toEqual([])
  })

  it("does not let one panel's artwork satisfy the other", () => {
    expect(missingCampaignCreatives("taxi_top", [bikeArt])).toEqual(["Taxi-top LED"])
    expect(missingCampaignCreatives("delivery_bike", [taxiArt])).toEqual(["Delivery bike box"])
  })

  // A "both" campaign runs on two physically different panels, so one file
  // cannot cover it — this is the case most likely to be got wrong.
  it("requires artwork for each panel on a 'both' campaign", () => {
    expect(missingCampaignCreatives("both", [taxiArt])).toEqual(["Delivery bike box"])
    expect(missingCampaignCreatives("both", [bikeArt])).toEqual(["Taxi-top LED"])
    expect(missingCampaignCreatives("both", [taxiArt, bikeArt])).toEqual([])
    expect(missingCampaignCreatives("both", [])).toEqual(["Taxi-top LED", "Delivery bike box"])
  })

  it("ignores creatives with unknown dimensions rather than counting them", () => {
    const unknown = { width: null, height: null } as never
    expect(missingCampaignCreatives("taxi_top", [unknown])).toEqual(["Taxi-top LED"])
  })
})

import { describe, expect, it } from "vitest"

import {
  CREATIVE_MIME_TYPES,
  CREATIVE_SPECS,
  checkCreativeDimensions,
  checkCreativeForFormat,
  describeSpec,
  specsForFormat,
} from "./creative-specs"
import { campaignCreateSchema, campaignReviewSchema, campaignUpdateSchema } from "./schemas"

const TAXI = CREATIVE_SPECS.taxi_top
const BIKE = CREATIVE_SPECS.delivery_bike

describe("creative mime types", () => {
  it("accepts exactly the four formats the supplier player decodes", () => {
    expect([...CREATIVE_MIME_TYPES]).toEqual([
      "image/png",
      "image/jpeg",
      "image/gif",
      "video/mp4",
    ])
  })

  // Regression guard: an earlier draft of this feature allowed WebP and WebM.
  // The player cannot decode them, so creative would have passed ops review
  // and then failed silently on the vehicle.
  it("excludes formats the player cannot decode", () => {
    for (const banned of ["image/webp", "video/webm", "image/bmp"]) {
      expect(CREATIVE_MIME_TYPES).not.toContain(banned)
    }
  })
})

describe("checkCreativeDimensions", () => {
  it("passes artwork at the exact panel canvas", () => {
    expect(checkCreativeDimensions(TAXI, 960, 320).level).toBe("ok")
    expect(checkCreativeDimensions(BIKE, 320, 320).level).toBe("ok")
  })

  it("passes larger artwork at the correct aspect ratio", () => {
    expect(checkCreativeDimensions(TAXI, 1920, 640).level).toBe("ok")
    expect(checkCreativeDimensions(BIKE, 1080, 1080).level).toBe("ok")
  })

  it("warns, but does not reject, correctly shaped artwork below the canvas", () => {
    const result = checkCreativeDimensions(TAXI, 480, 160)
    expect(result.level).toBe("warn")
    expect(result.ok).toBe(true)
    expect(result.message).toMatch(/smaller/i)
  })

  it("rejects the wrong aspect ratio", () => {
    const result = checkCreativeDimensions(TAXI, 800, 600)
    expect(result.level).toBe("fail")
    expect(result.ok).toBe(false)
    expect(result.message).toContain("3:1")
  })

  it("does not confuse the two panels", () => {
    expect(checkCreativeDimensions(TAXI, 640, 640).level).toBe("fail")
    expect(checkCreativeDimensions(BIKE, 960, 320).level).toBe("fail")
  })

  it("allows encoder rounding but not a genuinely wrong shape", () => {
    // 966/320 = 3.019, inside the 2% tolerance.
    expect(checkCreativeDimensions(TAXI, 966, 320).level).not.toBe("fail")
    // 1040/320 = 3.25, outside it.
    expect(checkCreativeDimensions(TAXI, 1040, 320).level).toBe("fail")
  })

  it("fails unreadable dimensions rather than dividing by zero", () => {
    expect(checkCreativeDimensions(TAXI, 0, 0).level).toBe("fail")
    expect(checkCreativeDimensions(TAXI, Number.NaN, 320).level).toBe("fail")
  })
})

describe("specsForFormat", () => {
  it("requires both panels for a 'both' campaign", () => {
    expect(specsForFormat("both").map((s) => s.format)).toEqual(["taxi_top", "delivery_bike"])
    expect(specsForFormat("taxi_top")).toHaveLength(1)
  })

  it("accepts either panel's artwork on a 'both' campaign", () => {
    expect(checkCreativeForFormat("both", 960, 320).level).toBe("ok")
    expect(checkCreativeForFormat("both", 320, 320).level).toBe("ok")
    expect(checkCreativeForFormat("both", 800, 600).level).toBe("fail")
  })
})

describe("describeSpec", () => {
  it("names the canvas, ratio, and side count", () => {
    expect(describeSpec(TAXI)).toBe("Taxi-top LED — 960 x 320 mm, 3:1, double-sided")
    expect(describeSpec(BIKE)).toBe("Delivery bike box — 320 x 320 mm, P2.5, 1:1, three sides")
  })
})

describe("campaign schemas", () => {
  it("requires a name", () => {
    expect(campaignCreateSchema.safeParse({ name: "Kilimani Launch" }).success).toBe(true)
    expect(campaignCreateSchema.safeParse({ name: "   " }).success).toBe(false)
    expect(campaignCreateSchema.safeParse({}).success).toBe(false)
  })

  it("rejects a flight that ends before it starts", () => {
    const result = campaignCreateSchema.safeParse({
      name: "Backwards",
      starts_on: "2026-10-01",
      ends_on: "2026-09-01",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a single-day flight", () => {
    expect(
      campaignCreateSchema.safeParse({
        name: "One day",
        starts_on: "2026-10-01",
        ends_on: "2026-10-01",
      }).success,
    ).toBe(true)
  })

  it("accepts a half-open window, since the wizard saves one step at a time", () => {
    expect(campaignCreateSchema.safeParse({ name: "TBD", starts_on: "2026-10-01" }).success).toBe(
      true,
    )
  })

  it("rejects a non-ISO date", () => {
    expect(
      campaignCreateSchema.safeParse({ name: "Bad date", starts_on: "01/10/2026" }).success,
    ).toBe(false)
  })

  it("allows an empty update body but still orders the window", () => {
    expect(campaignUpdateSchema.safeParse({}).success).toBe(true)
    expect(
      campaignUpdateSchema.safeParse({ starts_on: "2026-10-05", ends_on: "2026-10-04" }).success,
    ).toBe(false)
  })

  it("leaves the review reason optional — the route enforces it per decision", () => {
    expect(campaignReviewSchema.safeParse({ decision: "approved" }).success).toBe(true)
    expect(
      campaignReviewSchema.safeParse({ decision: "rejected", reason: "Wrong aspect ratio" })
        .success,
    ).toBe(true)
    expect(campaignReviewSchema.safeParse({ decision: "deleted" }).success).toBe(false)
  })
})

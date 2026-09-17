import { describe, expect, it } from "vitest"

import {
  SAFETY_INCIDENT_TYPES,
  SEVERITY_BY_TYPE,
  safetyIncidentCreateSchema,
  safetyIncidentDriverUpdateSchema,
  safetyIncidentLocationSchema,
} from "./index"

describe("SEVERITY_BY_TYPE", () => {
  it("maps every incident type — a missing entry would silently default a real emergency", () => {
    for (const type of SAFETY_INCIDENT_TYPES) {
      expect(SEVERITY_BY_TYPE[type]).toBeDefined()
    }
  })

  it("treats accident, medical and harassment as critical", () => {
    expect(SEVERITY_BY_TYPE.accident).toBe("critical")
    expect(SEVERITY_BY_TYPE.medical).toBe("critical")
    expect(SEVERITY_BY_TYPE.harassment).toBe("critical")
  })
})

describe("safetyIncidentCreateSchema", () => {
  it("accepts a report with no location at all — the report is never blocked on a fix", () => {
    const parsed = safetyIncidentCreateSchema.safeParse({
      type: "accident",
      channel: "driver-mobile",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects an unknown incident type", () => {
    const parsed = safetyIncidentCreateSchema.safeParse({
      type: "alien_abduction",
      channel: "driver-mobile",
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects out-of-range coordinates", () => {
    const parsed = safetyIncidentCreateSchema.safeParse({
      type: "breakdown",
      channel: "driver-web",
      reported_lat: 91,
      reported_lng: 36.8,
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects a channel from a non-driver app", () => {
    const parsed = safetyIncidentCreateSchema.safeParse({
      type: "accident",
      channel: "customer-web",
    })
    expect(parsed.success).toBe(false)
  })
})

describe("safetyIncidentLocationSchema", () => {
  it("requires both coordinates — a half-fix is not a position", () => {
    expect(safetyIncidentLocationSchema.safeParse({ lat: -1.29 }).success).toBe(false)
    expect(safetyIncidentLocationSchema.safeParse({ lat: -1.29, lng: 36.82 }).success).toBe(true)
  })
})

describe("safetyIncidentDriverUpdateSchema", () => {
  it("lets a driver cancel", () => {
    expect(safetyIncidentDriverUpdateSchema.safeParse({ status: "cancelled" }).success).toBe(true)
  })

  it("refuses any other transition — resolving is ops-only", () => {
    expect(safetyIncidentDriverUpdateSchema.safeParse({ status: "resolved" }).success).toBe(false)
    expect(safetyIncidentDriverUpdateSchema.safeParse({ status: "acknowledged" }).success).toBe(
      false,
    )
  })
})

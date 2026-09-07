import { describe, expect, it } from "vitest"

import {
  canAcceptPhoto,
  isTerminalStatus,
  pingAdmission,
  severityForType,
  toDriverIncident,
} from "./safety-incident"

const HOUR = 60 * 60 * 1000

describe("severityForType", () => {
  it("derives critical for an accident", () => {
    expect(severityForType("accident")).toBe("critical")
  })

  it("falls back to high for an unrecognised type rather than throwing", () => {
    expect(severityForType("nonsense" as never)).toBe("high")
  })
})

describe("isTerminalStatus", () => {
  it.each(["resolved", "cancelled"])("treats %s as terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(true)
  })

  it.each(["new", "acknowledged", "in_progress"])("treats %s as open", (status) => {
    expect(isTerminalStatus(status)).toBe(false)
  })
})

describe("pingAdmission", () => {
  const now = new Date("2026-09-06T12:00:00Z")

  it("accepts a ping for a fresh open incident", () => {
    const created_at = new Date(now.getTime() - 10 * 60_000)
    expect(pingAdmission({ status: "acknowledged", created_at }, now)).toBe("accept")
  })

  it("refuses a ping once the incident is resolved", () => {
    const created_at = new Date(now.getTime() - 10 * 60_000)
    expect(pingAdmission({ status: "resolved", created_at }, now)).toBe("terminal")
  })

  it("refuses a ping for an incident older than 6h — a phone left in a drawer must stop", () => {
    const created_at = new Date(now.getTime() - 7 * HOUR)
    expect(pingAdmission({ status: "new", created_at }, now)).toBe("stale")
  })

  it("still accepts at 5h59m — the cutoff is 6h, not 'about 6h'", () => {
    const created_at = new Date(now.getTime() - (6 * HOUR - 60_000))
    expect(pingAdmission({ status: "new", created_at }, now)).toBe("accept")
  })

  it("reports terminal before stale when an old incident is also resolved", () => {
    const created_at = new Date(now.getTime() - 9 * HOUR)
    expect(pingAdmission({ status: "cancelled", created_at }, now)).toBe("terminal")
  })
})

describe("canAcceptPhoto", () => {
  const jpeg = { type: "image/jpeg", size: 1_000 }

  it("accepts the fourth photo", () => {
    expect(canAcceptPhoto(3, jpeg).ok).toBe(true)
  })

  it("rejects the fifth", () => {
    expect(canAcceptPhoto(4, jpeg).ok).toBe(false)
  })

  it("rejects a PDF", () => {
    expect(canAcceptPhoto(0, { type: "application/pdf", size: 1_000 }).ok).toBe(false)
  })

  it("rejects a file over 8MB", () => {
    expect(canAcceptPhoto(0, { type: "image/jpeg", size: 9 * 1024 * 1024 }).ok).toBe(false)
  })
})

describe("toDriverIncident", () => {
  const base = {
    id: 1,
    driver_clerk_user_id: "user_1",
    driver_name: "David M.",
    driver_phone: "+254700000000",
    type: "accident",
    severity: "critical",
    status: "acknowledged",
    description: null,
    reported_lat: -1.29,
    reported_lng: 36.82,
    reported_accuracy_m: 12,
    last_lat: null,
    last_lng: null,
    last_location_at: null,
    acknowledged_at: new Date("2026-09-06T12:05:00Z"),
    acknowledged_by_email: "ops@admobi.test",
    resolved_at: null,
    resolved_by_email: null,
    resolution: null,
    created_at: new Date("2026-09-06T12:00:00Z"),
    updated_at: new Date("2026-09-06T12:05:00Z"),
  }

  const update = (id: number, internal_note: boolean) => ({
    id,
    incident_id: 1,
    author_type: "ops",
    author_email: "ops@admobi.test",
    author_clerk_id: null,
    body: internal_note ? "check the police abstract" : "We are on our way",
    internal_note,
    created_at: new Date("2026-09-06T12:06:00Z"),
  })

  it("never leaks an internal ops note to the driver", () => {
    const dto = toDriverIncident(base, [], [update(1, false), update(2, true)])
    expect(dto.updates).toHaveLength(1)
    expect(dto.updates[0]!.id).toBe(1)
  })

  it("serialises dates to ISO strings and counts photos", () => {
    const photo = {
      id: 9,
      incident_id: 1,
      cloudinary_public_id: "safety-incidents/1/abc",
      content_type: "image/jpeg",
      size_bytes: 1234,
      created_at: new Date("2026-09-06T12:01:00Z"),
    }
    const dto = toDriverIncident(base, [photo], [])
    expect(dto.photo_count).toBe(1)
    expect(dto.acknowledged_at).toBe("2026-09-06T12:05:00.000Z")
    // The private Cloudinary id must never reach a client.
    expect(JSON.stringify(dto)).not.toContain("safety-incidents/1/abc")
  })
})

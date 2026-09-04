import { describe, expect, it } from "vitest"

import {
  getAdmobiEmailError,
  isAdmobiEmail,
} from "./allowed-email"
import { ANNOUNCEMENT_TARGET_APPS } from "./enums"
import {
  formatBytes,
  formatLabel,
  formatRelativeTime,
  parseId,
} from "./format"
import {
  driverCreateSchema,
  fleetCreateSchema,
  leadCreateSchema,
  mediaKitCreateSchema,
  waitlistCreateSchema,
} from "./schemas"

describe("allowed email", () => {
  it("accepts @admobihq.com addresses", () => {
    expect(isAdmobiEmail("ops@admobihq.com")).toBe(true)
    expect(isAdmobiEmail(" OPS@AdmobiHQ.com ")).toBe(true)
  })

  it("rejects other domains and empty values", () => {
    expect(isAdmobiEmail("user@gmail.com")).toBe(false)
    expect(isAdmobiEmail("")).toBe(false)
    expect(isAdmobiEmail(null)).toBe(false)
  })

  it("surfaces a live validation error for wrong domains", () => {
    expect(getAdmobiEmailError("user@gmail.com")).toMatch(/@admobihq\.com/)
    expect(getAdmobiEmailError("ops@admobihq.com")).toBeNull()
    expect(getAdmobiEmailError("ops@")).toBeNull()
  })
})

describe("format helpers", () => {
  it("formats labels and empty values", () => {
    expect(formatLabel("taxi_top")).toBe("taxi top")
    expect(formatLabel(null)).toBe("—")
  })

  it("formats byte sizes", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(1024)).toBe("1 KB")
  })

  it("formats relative times", () => {
    const now = new Date("2026-07-30T12:00:00.000Z")
    expect(formatRelativeTime(new Date(now.getTime() - 30_000), now)).toBe(
      "Just now",
    )
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000), now)).toBe(
      "5m ago",
    )
  })

  it("parses positive integer ids", () => {
    expect(parseId("42")).toBe(42)
    expect(parseId("0")).toBeNull()
    expect(parseId("abc")).toBeNull()
  })
})

describe("zod schemas", () => {
  it("accepts a valid lead create payload", () => {
    const result = leadCreateSchema.safeParse({
      contact_name: "Jane Doe",
      email: "jane@brand.co.ke",
      company_name: "Brand Co",
      cities: ["Nairobi"],
      ad_formats: ["taxi_top"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid lead create payload", () => {
    const result = leadCreateSchema.safeParse({
      contact_name: "",
      email: "not-an-email",
      company_name: "Brand Co",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a valid waitlist email", () => {
    const result = waitlistCreateSchema.safeParse({
      email: "hello@example.com",
      source: "landing",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid waitlist email", () => {
    const result = waitlistCreateSchema.safeParse({ email: "nope" })
    expect(result.success).toBe(false)
  })

  it("accepts a driver payload with all new qualifying fields", () => {
    const result = driverCreateSchema.safeParse({
      name: "Sam K",
      phone: "0700000000",
      city: "Nairobi",
      vehicle_make_model: "Toyota Vitz",
      vehicle_year: "2016",
      vehicle_ownership: "owned",
      routes_areas: "Kilimani, Lavington",
      hours_per_day: "8_12",
      platforms: ["uber", "bolt"],
      applicant_message: "Available weekday evenings",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a driver payload with an unknown vehicle_ownership", () => {
    const result = driverCreateSchema.safeParse({
      name: "Sam K",
      phone: "0700000000",
      city: "Nairobi",
      vehicle_ownership: "spaceship",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a driver payload omitting every new field", () => {
    const result = driverCreateSchema.safeParse({
      name: "Sam K",
      phone: "0700000000",
      city: "Nairobi",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a fleet payload with the new composition + EV fields", () => {
    const result = fleetCreateSchema.safeParse({
      email: "ops@fleet.co.ke",
      company_name: "Acme Cabs",
      primary_contact_name: "Jo",
      phone: "0700000000",
      city: "Nairobi",
      fleet_types: ["taxi"],
      taxi_count: "40",
      bike_count: "10",
      operating_cities: ["Nairobi", "Mombasa"],
      ev_status: "some",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a fleet payload with an unknown ev_status", () => {
    const result = fleetCreateSchema.safeParse({
      email: "ops@fleet.co.ke",
      company_name: "Acme Cabs",
      primary_contact_name: "Jo",
      phone: "0700000000",
      city: "Nairobi",
      fleet_types: ["taxi"],
      ev_status: "hydrogen",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a lead payload with the new campaign-intent fields", () => {
    const result = leadCreateSchema.safeParse({
      contact_name: "Jane Doe",
      email: "jane@brand.co.ke",
      company_name: "Brand Co",
      cities: ["Nairobi"],
      ad_formats: ["taxi_top"],
      objective: "launch",
      industry: "FMCG",
      creative_status: "needs_design",
      target_audience: "Urban 18-34",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a lead payload with an unknown creative_status", () => {
    const result = leadCreateSchema.safeParse({
      contact_name: "Jane Doe",
      email: "jane@brand.co.ke",
      company_name: "Brand Co",
      creative_status: "telepathy",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a media-kit payload with the optional profile fields", () => {
    const result = mediaKitCreateSchema.safeParse({
      name: "Ada",
      email: "ada@agency.co.ke",
      company: "Agency X",
      role: "Media planner",
      use_case: "Q1 taxi-top campaign for a bank client",
    })
    expect(result.success).toBe(true)
  })

  it("still accepts a bare media-kit payload", () => {
    const result = mediaKitCreateSchema.safeParse({ name: "Ada", email: "ada@agency.co.ke" })
    expect(result.success).toBe(true)
  })

  it("accepts a waitlist payload with name + persona", () => {
    const result = waitlistCreateSchema.safeParse({
      email: "hi@example.com",
      name: "Riri",
      persona: "advertiser",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a waitlist payload with an unknown persona", () => {
    const result = waitlistCreateSchema.safeParse({
      email: "hi@example.com",
      persona: "astronaut",
    })
    expect(result.success).toBe(false)
  })
})

describe("announcement target apps", () => {
  it("includes both mobile and web apps", () => {
    expect(ANNOUNCEMENT_TARGET_APPS).toEqual([
      "customer-mobile",
      "driver-mobile",
      "customer-web",
      "driver-web",
    ])
  })
})

import { describe, expect, it } from "vitest"

import {
  campaignLeadSchema,
  driverJoinSchema,
  fleetLeadSchema,
  mediaKitSchema,
  waitlistSchema,
} from "./lead-schemas"

describe("public lead schemas — new optional fields", () => {
  it("driverJoinSchema accepts a payload with every new field omitted", () => {
    expect(
      driverJoinSchema.safeParse({
        name: "A", phone: "0700000000", city: "Nairobi",
        vehicleType: "taxi", daysPerWeek: "3_4", heardAbout: "whatsapp",
        consent: true,
      }).success,
    ).toBe(true)
  })

  it("campaignLeadSchema accepts blank strings from unfilled selects/date", () => {
    expect(
      campaignLeadSchema.safeParse({
        audience: "campaign", name: "A", email: "a@b.co", company: "C",
        cities: ["Nairobi"], adFormats: ["taxi_top"], duration: "1_week",
        budget: "not_sure",
        objective: "", creativeStatus: "", campaignStartDate: "",
        consent: true,
      }).success,
    ).toBe(true)
  })

  it("campaignLeadSchema still rejects an unknown objective", () => {
    expect(
      campaignLeadSchema.safeParse({
        audience: "campaign", name: "A", email: "a@b.co", company: "C",
        cities: ["Nairobi"], adFormats: ["taxi_top"], duration: "1_week",
        budget: "not_sure", objective: "spaceship", consent: true,
      }).success,
    ).toBe(false)
  })

  it("fleetLeadSchema accepts a payload with every new field omitted", () => {
    expect(
      fleetLeadSchema.safeParse({
        audience: "fleet", fleetOrCompanyName: "F", primaryContactName: "P",
        email: "a@b.co", phone: "0700000000", city: "Nairobi",
        fleetTypes: ["taxi"], vehicleCount: 5, vehiclesActive: "yes",
        consent: true,
      }).success,
    ).toBe(true)
  })

  it("mediaKitSchema and waitlistSchema accept bare payloads", () => {
    expect(mediaKitSchema.safeParse({ name: "A", email: "a@b.co" }).success).toBe(true)
    expect(waitlistSchema.safeParse({ email: "a@b.co" }).success).toBe(true)
  })
})

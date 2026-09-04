import { describe, expect, it } from "vitest"

import {
  DRIVER_FORM_FIELDS,
  driverFormFromRecord,
  driverFormToPayload,
  FLEET_FORM_FIELDS,
  fleetFormFromRecord,
  fleetFormToPayload,
  LEAD_FORM_FIELDS,
  leadFormFromRecord,
  leadFormToPayload,
} from "./form-fields"

describe("driver form mappers", () => {
  it("round-trips the new qualifying fields incl. platforms array", () => {
    const record = {
      id: 1,
      name: "Sam K",
      phone: "0700000000",
      email: null,
      city: "Nairobi",
      vehicle_type: "taxi",
      days_per_week: "5_6",
      heard_about: "friend",
      status: "pending",
      notes: null,
      vehicle_make_model: "Toyota Vitz",
      vehicle_year: "2016",
      vehicle_ownership: "owned",
      routes_areas: "Kilimani",
      hours_per_day: "8_12",
      platforms: ["uber", "bolt"],
      applicant_message: "Evenings only",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    } as never

    const payload = driverFormToPayload(driverFormFromRecord(record))

    expect(payload.vehicle_make_model).toBe("Toyota Vitz")
    expect(payload.vehicle_ownership).toBe("owned")
    expect(payload.hours_per_day).toBe("8_12")
    expect(payload.platforms).toEqual(["uber", "bolt"])
    expect(payload.applicant_message).toBe("Evenings only")
  })

  it("exposes the new fields in DRIVER_FORM_FIELDS", () => {
    const names = DRIVER_FORM_FIELDS.map((f) => f.name)
    expect(names).toEqual(
      expect.arrayContaining([
        "vehicle_make_model",
        "vehicle_ownership",
        "hours_per_day",
        "platforms",
        "applicant_message",
      ]),
    )
  })
})

describe("fleet form mappers", () => {
  it("round-trips composition + EV fields incl. operating_cities array", () => {
    const record = {
      id: 1,
      email: "ops@fleet.co.ke",
      company_name: "Acme Cabs",
      primary_contact_name: "Jo",
      phone: "0700000000",
      city: "Nairobi",
      fleet_types: ["taxi"],
      fleet_size: "50",
      vehicles_active: "yes",
      notes: null,
      status: "pending",
      taxi_count: "40",
      bike_count: "10",
      operating_cities: ["Nairobi", "Mombasa"],
      ev_status: "some",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    } as never

    const payload = fleetFormToPayload(fleetFormFromRecord(record))

    expect(payload.taxi_count).toBe("40")
    expect(payload.bike_count).toBe("10")
    expect(payload.operating_cities).toEqual(["Nairobi", "Mombasa"])
    expect(payload.ev_status).toBe("some")
  })

  it("exposes the new fields in FLEET_FORM_FIELDS", () => {
    const names = FLEET_FORM_FIELDS.map((f) => f.name)
    expect(names).toEqual(
      expect.arrayContaining([
        "taxi_count",
        "bike_count",
        "operating_cities",
        "ev_status",
      ]),
    )
  })
})

describe("lead form mappers", () => {
  it("round-trips the new campaign-intent fields", () => {
    const record = {
      id: 1,
      contact_name: "Jane Doe",
      email: "jane@brand.co.ke",
      company_name: "Brand Co",
      phone: null,
      audience: "campaign",
      cities: ["Nairobi"],
      ad_formats: ["taxi_top"],
      duration: "1_week",
      budget_range: "not_sure",
      campaign_start_date: null,
      additional_info: null,
      status: "new",
      objective: "launch",
      industry: "FMCG",
      creative_status: "needs_design",
      target_audience: "Urban 18-34",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    } as never

    const payload = leadFormToPayload(leadFormFromRecord(record))
    expect(payload.objective).toBe("launch")
    expect(payload.industry).toBe("FMCG")
    expect(payload.creative_status).toBe("needs_design")
    expect(payload.target_audience).toBe("Urban 18-34")
  })

  it("exposes the new fields in LEAD_FORM_FIELDS", () => {
    const names = LEAD_FORM_FIELDS.map((f) => f.name)
    expect(names).toEqual(
      expect.arrayContaining([
        "objective",
        "industry",
        "creative_status",
        "target_audience",
      ]),
    )
  })
})

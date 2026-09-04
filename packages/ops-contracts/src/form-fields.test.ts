import { describe, expect, it } from "vitest"

import {
  DRIVER_FORM_FIELDS,
  driverFormFromRecord,
  driverFormToPayload,
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

import { describe, expect, it } from "vitest"

import { integrationInputSchema } from "./integration-costs"

const valid = { name: "Resend", category: "email", currency: "USD", billing_cycle: "monthly", status: "active" }

describe("integrationInputSchema", () => {
  it("fills the optional text fields and coerces a typed cost", () => {
    const out = integrationInputSchema.parse({ ...valid, cost: "20.5" })
    expect(out).toMatchObject({ cost: 20.5, purpose: "", url: "", plan: "", owner: "", notes: "" })
  })

  it("rejects what the form would: empty name, unknown category, negative cost, bad URL", () => {
    expect(integrationInputSchema.safeParse({ ...valid, name: "  " }).success).toBe(false)
    expect(integrationInputSchema.safeParse({ ...valid, category: "nope" }).success).toBe(false)
    expect(integrationInputSchema.safeParse({ ...valid, cost: -1 }).success).toBe(false)
    expect(integrationInputSchema.safeParse({ ...valid, url: "not a url" }).success).toBe(false)
  })

  it("accepts an empty URL and a real one", () => {
    expect(integrationInputSchema.safeParse({ ...valid, url: "" }).success).toBe(true)
    expect(integrationInputSchema.safeParse({ ...valid, url: "https://resend.com" }).success).toBe(true)
  })
})

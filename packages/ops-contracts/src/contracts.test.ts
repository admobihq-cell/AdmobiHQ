import { describe, expect, it } from "vitest"

import {
  getAdmobiEmailError,
  isAdmobiEmail,
} from "./allowed-email"
import {
  formatBytes,
  formatLabel,
  formatRelativeTime,
  parseId,
} from "./format"
import { leadCreateSchema, waitlistCreateSchema } from "./schemas"

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
})

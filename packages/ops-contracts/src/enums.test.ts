import { describe, expect, it } from "vitest"

import { ADVERTISER_PERMISSIONS, ADVERTISER_STARTER_ROLES } from "./enums"

describe("ADVERTISER_STARTER_ROLES", () => {
  it("only grants permissions that exist in ADVERTISER_PERMISSIONS", () => {
    for (const permissions of Object.values(ADVERTISER_STARTER_ROLES)) {
      for (const permission of permissions) {
        expect(ADVERTISER_PERMISSIONS).toContain(permission)
      }
    }
  })

  it("gives Member every permission Viewer has, plus more", () => {
    const viewer = new Set(ADVERTISER_STARTER_ROLES.Viewer)
    const member = new Set(ADVERTISER_STARTER_ROLES.Member)
    for (const permission of viewer) {
      expect(member.has(permission)).toBe(true)
    }
    expect(member.size).toBeGreaterThan(viewer.size)
  })

  it("only Manager can submit campaigns", () => {
    expect(ADVERTISER_STARTER_ROLES.Manager).toContain("campaigns:submit")
    expect(ADVERTISER_STARTER_ROLES.Member).not.toContain("campaigns:submit")
    expect(ADVERTISER_STARTER_ROLES.Viewer).not.toContain("campaigns:submit")
  })
})

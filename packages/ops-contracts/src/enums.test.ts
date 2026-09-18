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

  it("Member cannot submit campaigns — that stays an admin/custom-role permission", () => {
    expect(ADVERTISER_STARTER_ROLES.Member).not.toContain("campaigns:submit")
  })

  it("Admin holds every permission — the owner-invitable tier short of the bypass itself", () => {
    for (const permission of ADVERTISER_PERMISSIONS) {
      expect(ADVERTISER_STARTER_ROLES.Admin).toContain(permission)
    }
  })
})

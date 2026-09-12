import { describe, expect, it } from "vitest"

import {
  advertiserInviteSchema,
  advertiserMemberUpdateSchema,
  advertiserOrgRenameSchema,
} from "./advertiser-org"

describe("advertiser org schemas", () => {
  it("accepts a rename with a trimmed name", () => {
    expect(advertiserOrgRenameSchema.parse({ name: "  Acme  " })).toEqual({ name: "Acme" })
  })

  it("rejects an empty rename", () => {
    expect(() => advertiserOrgRenameSchema.parse({ name: "   " })).toThrow()
  })

  it("accepts an invite with email + roleId", () => {
    expect(advertiserInviteSchema.parse({ email: "a@b.com", roleId: 3 })).toEqual({
      email: "a@b.com",
      roleId: 3,
    })
  })

  it("requires roleId or isOwner on member update", () => {
    expect(() => advertiserMemberUpdateSchema.parse({})).toThrow()
    expect(advertiserMemberUpdateSchema.parse({ isOwner: true })).toEqual({ isOwner: true })
    expect(advertiserMemberUpdateSchema.parse({ roleId: 2 })).toEqual({ roleId: 2 })
  })
})

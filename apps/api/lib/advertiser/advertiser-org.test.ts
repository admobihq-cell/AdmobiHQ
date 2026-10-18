import { describe, expect, it, vi } from "vitest"

import type { AdvertiserPermission } from "@workspace/ops-contracts"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/customer/customer-clerk", () => ({}))

import { canGrantRole } from "./advertiser-org"

const holder = (...permissions: AdvertiserPermission[]) => ({
  isOwner: false,
  permissions: new Set(permissions),
})

const ADMIN = { permissions: ["team:manage", "billing:write", "org:manage"] }

describe("canGrantRole", () => {
  it("blocks team:manage alone from granting a bigger role (the self-escalation path)", () => {
    expect(canGrantRole(holder("team:manage"), ADMIN)).toBe(false)
  })

  it("allows granting a subset of what the granter holds", () => {
    expect(canGrantRole(holder("team:manage", "campaigns:read"), { permissions: ["campaigns:read"] })).toBe(true)
    expect(canGrantRole(holder("team:manage", "billing:write", "org:manage"), ADMIN)).toBe(true)
  })

  it("lets owners grant anything, including permissions outside the known set", () => {
    expect(canGrantRole({ isOwner: true, permissions: new Set() }, ADMIN)).toBe(true)
    expect(canGrantRole(holder("team:manage"), { permissions: ["made:up"] })).toBe(false)
  })
})

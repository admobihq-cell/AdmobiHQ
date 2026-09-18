import { describe, expect, it } from "vitest"

import { generateAdvertiserInviteToken, hashAdvertiserInviteToken } from "./advertiser-invite-token"

describe("advertiser invite tokens", () => {
  it("hashes stably and does not equal the raw token", () => {
    const token = generateAdvertiserInviteToken()
    const hash = hashAdvertiserInviteToken(token)
    expect(hash).not.toBe(token)
    expect(hashAdvertiserInviteToken(token)).toBe(hash)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

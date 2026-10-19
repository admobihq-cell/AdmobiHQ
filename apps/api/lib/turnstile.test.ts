import { afterEach, describe, expect, it, vi } from "vitest"

import { TURNSTILE_HEADER, verifyTurnstile } from "@/lib/turnstile"

function req(token?: string) {
  return new Request("https://api.example.com/v1/public/leads", {
    method: "POST",
    headers: token ? { [TURNSTILE_HEADER]: token } : {},
  })
}

function mockSiteverify(body: unknown, ok = true) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })))
}

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("allows everything when no secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "")
    expect(await verifyTurnstile(req())).toBe(true)
  })

  it("rejects a missing token once a secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret")
    expect(await verifyTurnstile(req())).toBe(false)
  })

  it("follows Cloudflare's verdict", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret")
    mockSiteverify({ success: false })
    expect(await verifyTurnstile(req("bad"))).toBe(false)
    mockSiteverify({ success: true })
    expect(await verifyTurnstile(req("good"))).toBe(true)
  })

  it("fails open when Cloudflare errors", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret")
    mockSiteverify({}, false)
    expect(await verifyTurnstile(req("any"))).toBe(true)
  })
})

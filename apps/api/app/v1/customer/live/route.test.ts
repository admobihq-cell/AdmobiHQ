import { afterEach, describe, expect, it, vi } from "vitest"

import { parseSseChunk, type LiveEvent } from "@workspace/ops-contracts"

const orgId = 900_000 + (Date.now() % 100_000)

vi.mock("@/lib/api-utils", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")),
  requireCustomerAccess: vi.fn(async () => ({
    access: { userId: `live-test-${orgId}`, orgId, isOwner: true, permissions: new Set() },
  })),
}))

const env = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }

afterEach(() => {
  // Assigning undefined would store the string "undefined", which looks configured.
  for (const [key, value] of [
    ["UPSTASH_REDIS_REST_URL", env.url],
    ["UPSTASH_REDIS_REST_TOKEN", env.token],
  ] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  vi.resetModules()
})

describe("GET /v1/customer/live", () => {
  it("returns 204 without Upstash", async () => {
    // Import first: loading the app re-reads .env files; the Redis client reads env lazily.
    const { GET } = await import("./route")
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const res = await GET(new Request("http://test/v1/customer/live"))
    expect(res.status).toBe(204)
  })

  it.skipIf(!env.url || !env.token)("streams a published event", { timeout: 20_000 }, async () => {
    const { GET } = await import("./route")
    const { liveChannel, publishLive } = await import("@/lib/realtime")
    const controller = new AbortController()
    const res = await GET(new Request("http://test/v1/customer/live", { signal: controller.signal }))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    const received: LiveEvent[] = []
    let published = false
    while (received.length === 0) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      if (!published && buffer.includes(": connected")) {
        published = true
        // Give Upstash a moment to register the subscription before publishing.
        setTimeout(() => void publishLive([liveChannel.org(orgId)], { topic: "payment", id: 1 }), 1000)
      }
      const parsed = parseSseChunk(buffer)
      buffer = parsed.rest
      received.push(...parsed.events)
    }
    controller.abort()
    await reader.cancel().catch(() => {})
    expect(received[0]).toEqual({ topic: "payment", id: 1 })
  })
})

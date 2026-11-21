import { afterEach, describe, expect, it, vi } from "vitest"

const publish = vi.fn()
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function Redis() {
    return { publish }
  }),
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
  publish.mockReset()
  vi.resetModules()
})

describe("publishLive", () => {
  it("does nothing without Upstash", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const { publishLive } = await import("./realtime")
    await expect(publishLive(["ops"], { topic: "sos", id: 1 })).resolves.toBeUndefined()
    expect(publish).not.toHaveBeenCalled()
  })

  it("publishes to every channel and never throws", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "t"
    publish.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error("down"))
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const { publishLive } = await import("./realtime")
    await expect(publishLive(["org:1", "ops"], { topic: "payment", id: 9 })).resolves.toBeUndefined()
    expect(publish).toHaveBeenCalledWith("org:1", { topic: "payment", id: 9 })
    expect(publish).toHaveBeenCalledWith("ops", { topic: "payment", id: 9 })
    expect(error).toHaveBeenCalledTimes(1)
    error.mockRestore()
  })
})

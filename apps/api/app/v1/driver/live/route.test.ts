import { describe, expect, it, vi } from "vitest"

const { liveStreamResponse } = vi.hoisted(() => ({ liveStreamResponse: vi.fn(() => new Response("stream")) }))
vi.mock("@/lib/realtime", () => ({ liveRedis: () => ({}), liveChannel: { user: (id: string) => `user:${id}` } }))
vi.mock("@/lib/live-stream", () => ({ liveStreamResponse }))
vi.mock("@/lib/api-utils", () => ({
  requireDriverAccess: vi
    .fn()
    .mockResolvedValueOnce({ error: new Response(null, { status: 401 }) })
    .mockResolvedValue({ access: { userId: "drv1" } }),
}))

import { GET } from "./route"

const req = new Request("http://localhost/v1/driver/live")

describe("GET /v1/driver/live", () => {
  it("rejects a caller with no driver token, and streams only the caller's own channel", async () => {
    expect((await GET(req)).status).toBe(401)
    expect(liveStreamResponse).not.toHaveBeenCalled()
    await GET(req)
    expect(liveStreamResponse).toHaveBeenCalledWith(req, ["user:drv1"])
  })
})

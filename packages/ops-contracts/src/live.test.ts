import { describe, expect, it } from "vitest"

import { createRollingCap, isLiveEvent, nextLiveStep, parseSseChunk, reconnectDelay } from "./live"

describe("parseSseChunk", () => {
  it("returns complete events and keeps the unfinished tail", () => {
    const buffer =
      'data: {"topic":"payment","id":1}\n\n' + 'data: {"topic":"sos","id":2}\n\n' + 'data: {"topic":"supp'
    const { events, rest } = parseSseChunk(buffer)
    expect(events).toEqual([
      { topic: "payment", id: 1 },
      { topic: "sos", id: 2 },
    ])
    expect(rest).toBe('data: {"topic":"supp')
  })

  it("skips comments and heartbeats", () => {
    expect(parseSseChunk(": connected\n\n: ping\n\n")).toEqual({ events: [], rest: "" })
  })

  it("drops unknown topics and invalid JSON", () => {
    expect(parseSseChunk('data: {"topic":"bogus"}\n\ndata: not json\n\n').events).toEqual([])
  })

  it("handles CRLF line endings", () => {
    expect(parseSseChunk('data: {"topic":"notification","type":"campaign_approved"}\r\n\r\n').events).toEqual([
      { topic: "notification", type: "campaign_approved" },
    ])
  })
})

describe("isLiveEvent", () => {
  it("accepts only known topics with id-shaped fields", () => {
    expect(isLiveEvent({ topic: "review-queue", id: 4, actor: "user_1" })).toBe(true)
    expect(isLiveEvent({ topic: "review-queue", id: "4" })).toBe(false)
    expect(isLiveEvent(null)).toBe(false)
  })
})

describe("reconnectDelay", () => {
  it("backs off and caps at 30s", () => {
    expect([0, 1, 2, 3, 4, 9].map(reconnectDelay)).toEqual([1000, 2000, 5000, 10000, 30000, 30000])
  })
})

describe("live event nonce", () => {
  it("accepts a string nonce and rejects other types", () => {
    expect(isLiveEvent({ topic: "payment", nonce: "abc" })).toBe(true)
    expect(isLiveEvent({ topic: "payment", nonce: 1 })).toBe(false)
  })
})

describe("nextLiveStep", () => {
  const fresh = { attempt: 0, authFailures: 0, gap: false }

  it("stops for 204 and 403", () => {
    expect(nextLiveStep({ kind: "http", status: 204 }, fresh).stop).toBe(true)
    expect(nextLiveStep({ kind: "http", status: 403 }, fresh).stop).toBe(true)
  })

  it("retries 401 twice, then stops", () => {
    let state = fresh
    for (let i = 0; i < 2; i++) {
      const step = nextLiveStep({ kind: "http", status: 401 }, state)
      expect(step.stop).toBe(false)
      state = step
    }
    expect(nextLiveStep({ kind: "http", status: 401 }, state).stop).toBe(true)
  })

  it("reconnects at once after the server's planned close, without a refetch", () => {
    const step = nextLiveStep({ kind: "ended", uptimeMs: 280_000 }, { attempt: 3, authFailures: 0, gap: false })
    expect(step).toMatchObject({ stop: false, delayMs: 0, attempt: 0, gap: false })
  })

  it("backs off and marks a gap when a stream ends early", () => {
    const a = nextLiveStep({ kind: "ended", uptimeMs: 200 }, fresh)
    expect(a).toMatchObject({ stop: false, delayMs: 1000, attempt: 1, gap: true })
    const b = nextLiveStep({ kind: "ended", uptimeMs: 200 }, a)
    expect(b.delayMs).toBe(2000)
  })

  it("treats a drop after a stable stream as a fresh gap", () => {
    expect(nextLiveStep({ kind: "error", uptimeMs: 60_000 }, { attempt: 4, authFailures: 0, gap: false })).toMatchObject({
      delayMs: 1000,
      attempt: 1,
      gap: true,
    })
  })

  it("backs off on server errors", () => {
    expect(nextLiveStep({ kind: "http", status: 502 }, fresh)).toMatchObject({ stop: false, delayMs: 1000, attempt: 1, gap: true })
  })
})

describe("createRollingCap", () => {
  it("shows the first three in a window and folds the rest", () => {
    const cap = createRollingCap(3, 10_000)
    expect([0, 100, 200, 300, 400].map((t) => cap(t))).toEqual(["show", "show", "show", "fold", "fold"])
  })

  it("opens up again once the window passes", () => {
    const cap = createRollingCap(3, 10_000)
    for (const t of [0, 1, 2]) cap(t)
    expect(cap(10_001)).toBe("show")
  })
})

import { describe, expect, it } from "vitest"

import { isLiveEvent, parseSseChunk, reconnectDelay } from "./live"

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

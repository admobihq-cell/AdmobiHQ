/**
 * Live updates: what travels over the SSE stream. Topic and ids only — never names, amounts or
 * text — so the stream can't leak anything; clients re-fetch through the permission-checked API.
 */

export const LIVE_TOPICS = [
  "notification",
  "campaign",
  "payment",
  "billing-document",
  "review-queue",
  "support",
  "sos",
  "application",
] as const
export type LiveTopic = (typeof LIVE_TOPICS)[number]

export type LiveEvent = {
  topic: LiveTopic
  id?: number
  /** Notification type (e.g. `campaign_approved`), so the client knows which data to refresh. */
  type?: string
  /** Clerk user id of whoever caused it: the client skips the toast for its own actions. */
  actor?: string
}

const optional = (value: unknown, type: "number" | "string") => value === undefined || typeof value === type

export function isLiveEvent(value: unknown): value is LiveEvent {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    (LIVE_TOPICS as readonly unknown[]).includes(v.topic) &&
    optional(v.id, "number") &&
    optional(v.type, "string") &&
    optional(v.actor, "string")
  )
}

/** Splits an SSE text buffer into complete `data:` payloads; `rest` is the unfinished tail. */
export function parseSseChunk(buffer: string): { events: LiveEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, "\n")
  const blocks = normalized.split("\n\n")
  const rest = blocks.pop() ?? ""
  const events: LiveEvent[] = []
  for (const block of blocks) {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
    if (!data) continue
    try {
      const parsed: unknown = JSON.parse(data)
      if (isLiveEvent(parsed)) events.push(parsed)
    } catch {
      // not JSON: ignore
    }
  }
  return { events, rest }
}

const DELAYS = [1000, 2000, 5000, 10000]

/** Reconnect delay for attempt n (0-based): 1s, 2s, 5s, 10s, then 30s. */
export function reconnectDelay(attempt: number): number {
  return DELAYS[attempt] ?? 30_000
}

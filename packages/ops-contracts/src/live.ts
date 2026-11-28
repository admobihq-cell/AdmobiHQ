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
  /** A public form came in; `type` says which one. */
  "submission",
] as const
export type LiveTopic = (typeof LIVE_TOPICS)[number]

export type LiveEvent = {
  topic: LiveTopic
  id?: number
  /** Notification type (e.g. `campaign_approved`), so the client knows which data to refresh. */
  type?: string
  /** Clerk user id of whoever caused it: the client skips the toast for its own actions. */
  actor?: string
  /** Set by the publisher on every event: lets several open tabs agree it's the same alert. */
  nonce?: string
}

const optional = (value: unknown, type: "number" | "string") => value === undefined || typeof value === type

export function isLiveEvent(value: unknown): value is LiveEvent {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    (LIVE_TOPICS as readonly unknown[]).includes(v.topic) &&
    optional(v.id, "number") &&
    optional(v.type, "string") &&
    optional(v.actor, "string") &&
    optional(v.nonce, "string")
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

/** The server closes each stream at ~280 s; anything up this long ended as planned. */
const PLANNED_UPTIME_MS = 250_000
/** A stream that stayed up this long was healthy: its drop restarts the backoff. */
const STABLE_UPTIME_MS = 30_000
const MAX_AUTH_FAILURES = 3

export type LiveOutcome =
  | { kind: "http"; status: number }
  | { kind: "ended"; uptimeMs: number }
  | { kind: "error"; uptimeMs: number }

export type LiveState = { attempt: number; authFailures: number; gap: boolean }

/**
 * What the client does after a stream attempt ends. `gap` means events may have been missed, so
 * the next successful connect should refetch; a planned close leaves none, so routine reconnects
 * cost nothing (no refetch, so nothing wakes the database every few minutes).
 */
export function nextLiveStep(outcome: LiveOutcome, state: LiveState): LiveState & { stop: boolean; delayMs: number } {
  if (outcome.kind === "http") {
    if (outcome.status === 204 || outcome.status === 403) return { ...state, stop: true, delayMs: 0 }
    const authFailures = outcome.status === 401 ? state.authFailures + 1 : state.authFailures
    if (authFailures >= MAX_AUTH_FAILURES) return { ...state, authFailures, stop: true, delayMs: 0 }
    return { attempt: state.attempt + 1, authFailures, gap: true, stop: false, delayMs: reconnectDelay(state.attempt) }
  }
  if (outcome.kind === "ended" && outcome.uptimeMs >= PLANNED_UPTIME_MS) {
    return { attempt: 0, authFailures: 0, gap: state.gap, stop: false, delayMs: 0 }
  }
  const attempt = outcome.uptimeMs >= STABLE_UPTIME_MS ? 0 : state.attempt
  return { attempt: attempt + 1, authFailures: 0, gap: true, stop: false, delayMs: reconnectDelay(attempt) }
}

/** Allows `limit` per rolling `windowMs`; beyond that the caller folds into one summary. */
export function createRollingCap(limit: number, windowMs: number): (now: number) => "show" | "fold" {
  const shown: number[] = []
  return (now) => {
    while (shown.length > 0 && now - shown[0]! > windowMs) shown.shift()
    if (shown.length >= limit) return "fold"
    shown.push(now)
    return "show"
  }
}

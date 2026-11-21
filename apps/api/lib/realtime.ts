import { randomUUID } from "node:crypto"

import { Redis } from "@upstash/redis"

import type { LiveEvent } from "@workspace/ops-contracts"

/**
 * Live updates go out over Upstash Redis pub/sub, never through Postgres: a held DB connection or
 * a short poll would keep the Neon compute awake. Events carry a topic and ids only.
 */
export const liveChannel = {
  user: (clerkUserId: string) => `user:${clerkUserId}`,
  org: (orgId: number) => `org:${orgId}`,
  ops: "ops",
} as const

let client: Redis | null | undefined

/** One client per instance; null when Upstash isn't configured (local dev, tests). */
export function liveRedis(): Redis | null {
  if (client === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    client = url && token ? new Redis({ url, token }) : null
  }
  return client
}

/** Fire-and-forget PUBLISH to each channel. Never throws, so it can't fail the write it follows. */
export async function publishLive(channels: string[], event: LiveEvent): Promise<void> {
  const redis = liveRedis()
  if (!redis || channels.length === 0) return
  // The nonce lets several open tabs recognise the same alert (one plays the sound).
  const message: LiveEvent = { ...event, nonce: event.nonce ?? randomUUID() }
  const results = await Promise.allSettled(channels.map((channel) => redis.publish(channel, message)))
  const failed = results.filter((r) => r.status === "rejected")
  if (failed.length > 0) {
    console.error("[realtime] publish failed", { topic: event.topic, failed: failed.length })
  }
}

/**
 * The advertiser's org for their live stream, cached in Upstash (not Postgres) so the reconnect
 * every ~280 s doesn't wake Neon. A removed member keeps an ids-only stream for at most this
 * long; every real read still goes through the permission-checked API.
 */
const LIVE_ORG_TTL_S = 15 * 60

export async function readLiveOrgId(userId: string): Promise<number | null> {
  try {
    const value = await liveRedis()?.get<number>(`live:org:${userId}`)
    return typeof value === "number" ? value : null
  } catch {
    return null
  }
}

export async function writeLiveOrgId(userId: string, orgId: number): Promise<void> {
  try {
    await liveRedis()?.set(`live:org:${userId}`, orgId, { ex: LIVE_ORG_TTL_S })
  } catch {
    // cache only
  }
}

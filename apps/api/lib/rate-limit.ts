import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

import { jsonError } from "@/lib/api-utils"

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

const limiters = new Map<string, Ratelimit>()

function getLimiter(bucket: string, limit: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null

  const key = `${bucket}:${limit}:${windowSeconds}`
  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${bucket}`,
    })
    limiters.set(key, limiter)
  }
  return limiter
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return req.headers.get("x-real-ip")?.trim() ?? "unknown"
}

/**
 * Rate-limits a public route by client IP. Returns a 429 response to
 * short-circuit the handler, or null to let the request proceed.
 *
 * Fails open when Upstash isn't configured (UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN unset) rather than blocking every request — local
 * dev and any environment without those provisioned keep working unthrottled.
 */
export async function checkRateLimit(
  req: Request,
  bucket: string,
  { limit = 10, windowSeconds = 60 }: { limit?: number; windowSeconds?: number } = {},
) {
  const limiter = getLimiter(bucket, limit, windowSeconds)
  if (!limiter) return null

  const { success } = await limiter.limit(getClientIp(req))
  if (success) return null

  return jsonError("Too many requests — please try again shortly.", 429)
}

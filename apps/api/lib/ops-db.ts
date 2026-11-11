import { DATE_RANGE_KEYS, type DateRangeKey } from "@workspace/ops-contracts"
import type { Db } from "@workspace/ops-queries"

import { getPgPool } from "@/lib/pg"

/** The API's connection pool as the `Db` the shared ops queries take. */
export const opsDb = (): Db => getPgPool()

/**
 * `?range=` for the ops dashboard reads: absent means 30d, an unknown value is `null` so the route can
 * answer 400. (The ops web silently falls back to 30d; an API should say no.)
 */
export function readRange(req: Request): DateRangeKey | null {
  const value = new URL(req.url).searchParams.get("range")
  if (value === null) return "30d"
  return (DATE_RANGE_KEYS as readonly string[]).includes(value) ? (value as DateRangeKey) : null
}

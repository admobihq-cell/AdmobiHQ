import type { PublicConfigDto } from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"

const OK_TTL_MS = 5 * 60_000
const DOWN_TTL_MS = 60_000

type FlagMemo = {
  flags: Set<string>
  expiresAt: number
}

let memo: FlagMemo | null = null

/**
 * Server-side read of ops-controlled platform flags (e.g. "deliveries").
 * Successful reads revalidate every 5 minutes via Next's fetch cache.
 * Connection failures (API not running locally) are memoized for 60s so a
 * down localhost:3003 does not stall every layout render or spam ECONNREFUSED.
 */
export async function getPlatformFlags(): Promise<Set<string>> {
  if (memo && Date.now() < memo.expiresAt) return memo.flags

  try {
    const res = await fetch(`${apiPublicUrl()}/v1/public/config`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) {
      memo = { flags: new Set(), expiresAt: Date.now() + DOWN_TTL_MS }
      return memo.flags
    }

    const data = (await res.json()) as PublicConfigDto
    const flags = new Set(
      Object.entries(data.flags ?? {})
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    )
    memo = { flags, expiresAt: Date.now() + OK_TTL_MS }
    return flags
  } catch {
    // Flags are additive UI, never load-bearing — fail closed (all off).
    memo = { flags: new Set(), expiresAt: Date.now() + DOWN_TTL_MS }
    return memo.flags
  }
}

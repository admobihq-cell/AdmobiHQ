import type { PublicConfigDto } from "@workspace/ops-contracts"

import { apiPublicUrl } from "@/lib/site-urls"

/**
 * Server-side read of ops-controlled platform flags (e.g. "deliveries").
 * Revalidates every 60s via Next's fetch cache, so a toggle in ops propagates
 * here without a deploy — see docs/driver/DRIVER-APP.md for the full flag design.
 */
export async function getPlatformFlags(): Promise<Set<string>> {
  try {
    const res = await fetch(`${apiPublicUrl()}/v1/public/config`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return new Set()

    const data = (await res.json()) as PublicConfigDto
    return new Set(
      Object.entries(data.flags ?? {})
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    )
  } catch {
    // Flags are additive UI, never load-bearing — fail closed (all off).
    return new Set()
  }
}

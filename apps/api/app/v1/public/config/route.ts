import { NextResponse } from "next/server"

import { PLATFORM_FLAG_KEYS, type PublicConfigDto } from "@workspace/ops-contracts"

import { jsonError } from "@/lib/api-utils"
import {
  getCachedPublicFlags,
  setCachedPublicFlags,
} from "@/lib/public-config-cache"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"

/** Public, unauthenticated, and safe to be so — flags are visibility
 * toggles (e.g. showing the Deliveries placeholder screens), never secrets.
 * Every customer/driver app reads this on launch/foreground so an ops
 * toggle propagates without a deploy. */
export async function GET(req: Request) {
  const limited = await checkRateLimit(req, "public-config", { limit: 60, windowSeconds: 60 })
  if (limited) return limited

  try {
    const cached = getCachedPublicFlags()
    const rows =
      cached ??
      (await prisma.platformFlag.findMany({
        select: { key: true, enabled: true },
      }))
    if (!cached) setCachedPublicFlags(rows)

    const byKey = new Map(rows.map((row) => [row.key, row.enabled]))

    const flags: PublicConfigDto["flags"] = {}
    for (const key of PLATFORM_FLAG_KEYS) {
      flags[key] = byKey.get(key) ?? false
    }

    return NextResponse.json(
      { flags } satisfies PublicConfigDto,
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
    )
  } catch (error) {
    console.error("[public/config] failed:", error)
    return jsonError("Failed to load config", 500)
  }
}

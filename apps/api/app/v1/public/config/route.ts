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
  try {
    const cached = getCachedPublicFlags()
    if (cached) {
      return jsonFlags(cached)
    }

    const limited = await checkRateLimit(req, "public-config", { limit: 60, windowSeconds: 60 })
    if (limited) return limited

    const rows = await prisma.platformFlag.findMany({
      select: { key: true, enabled: true },
    })
    setCachedPublicFlags(rows)

    return jsonFlags(rows)
  } catch (error) {
    console.error("[public/config] failed:", error)
    return jsonError("Failed to load config", 500)
  }
}

function jsonFlags(rows: { key: string; enabled: boolean }[]) {
  const byKey = new Map(rows.map((row) => [row.key, row.enabled]))

  const flags: PublicConfigDto["flags"] = {}
  for (const key of PLATFORM_FLAG_KEYS) {
    flags[key] = byKey.get(key) ?? false
  }

  return NextResponse.json(
    { flags } satisfies PublicConfigDto,
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  )
}

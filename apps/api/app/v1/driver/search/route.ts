import { NextResponse } from "next/server"

import { parseSearchQuery, shouldSearch, type SearchResponseDto } from "@workspace/ops-contracts"

import { requireDriverAccess } from "@/lib/api-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { searchDriver } from "@/lib/search/driver-search"

/** Command palette search over the calling driver's own records. */
export async function GET(req: Request) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const limited = await checkRateLimit(req, "search", { limit: 60, windowSeconds: 60, identifier: auth.access.userId })
  if (limited) return limited

  const raw = new URL(req.url).searchParams.get("q") ?? ""
  const q = parseSearchQuery(raw)
  const body: SearchResponseDto = { query: q.text, groups: shouldSearch(raw) ? await searchDriver(q, auth.access.userId) : [] }
  return NextResponse.json(body)
}

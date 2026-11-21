import { NextResponse } from "next/server"

import { parseSearchQuery, shouldSearch, type SearchResponseDto } from "@workspace/ops-contracts"

import { requireOpsAccess } from "@/lib/api-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { searchOps } from "@/lib/search/ops-search"

/** Command palette search across ops records. Each group is gated by the permission its list screen uses. */
export async function GET(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const limited = await checkRateLimit(req, "search", { limit: 60, windowSeconds: 60, identifier: auth.access.userId })
  if (limited) return limited

  const raw = new URL(req.url).searchParams.get("q") ?? ""
  const q = parseSearchQuery(raw)
  const body: SearchResponseDto = {
    query: q.text,
    groups: shouldSearch(raw) ? await searchOps(q, auth.access) : [],
  }
  return NextResponse.json(body)
}

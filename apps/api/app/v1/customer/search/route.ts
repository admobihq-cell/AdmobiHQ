import { NextResponse } from "next/server"

import { parseSearchQuery, shouldSearch, type SearchResponseDto } from "@workspace/ops-contracts"

import { requireCustomerAccess } from "@/lib/api-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { searchCustomer } from "@/lib/search/customer-search"

/** Command palette search over the caller's own org. Each group needs the permission its screen needs. */
export async function GET(req: Request) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const limited = await checkRateLimit(req, "search", { limit: 60, windowSeconds: 60, identifier: auth.access.userId })
  if (limited) return limited

  const raw = new URL(req.url).searchParams.get("q") ?? ""
  const q = parseSearchQuery(raw)
  const body: SearchResponseDto = { query: q.text, groups: shouldSearch(raw) ? await searchCustomer(q, auth.access) : [] }
  return NextResponse.json(body)
}

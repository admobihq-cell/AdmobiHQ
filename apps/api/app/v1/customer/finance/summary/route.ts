import { NextResponse } from "next/server"

import { getFinanceSummary } from "@/lib/analytics/finance-queries"
import { parseReportQuery } from "@/lib/analytics/parse-report-query"
import { requireCustomerPermissionAccess } from "@/lib/api-utils"

/** Funds, spend and funding status for the caller's org. Needs `billing:read`. Read-only. */
export async function GET(req: Request) {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  const parsed = parseReportQuery(new URL(req.url))
  if (parsed.error) return parsed.error

  return NextResponse.json(await getFinanceSummary(auth.access.orgId, parsed.range))
}

import type { NextResponse } from "next/server"

import { parseReportFilters, parseReportQuery } from "@/lib/analytics/parse-report-query"
import type { ReportScope } from "@/lib/analytics/report-queries"
import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

/**
 * Everything a /v1/customer/reports/* route does before it queries: auth, range, filters, and
 * the ownership check on a `campaign` filter. `billing` also requires `billing:read` (the spend
 * tab). Whether money is visible is decided here once, from the caller's permissions.
 */
export async function reportRequest(
  req: Request,
  options: { billing?: boolean } = {}
): Promise<{ scope: ReportScope; error?: undefined } | { scope?: undefined; error: NextResponse | Response }> {
  const auth = await requireCustomerPermissionAccess("reports:read")
  if (auth.error) return { error: auth.error }
  const { orgId, isOwner, permissions } = auth.access
  const canSeeMoney = isOwner || permissions.has("billing:read")
  if (options.billing && !canSeeMoney) {
    return { error: jsonError('Forbidden — "billing:read" access required', 403) }
  }

  const url = new URL(req.url)
  const range = parseReportQuery(url)
  if (range.error) return { error: range.error }
  const filters = parseReportFilters(url)
  if (filters.error) return { error: filters.error }

  if (filters.filters.campaignId) {
    const own = await prisma.campaign.findFirst({
      where: { id: filters.filters.campaignId, org_id: orgId },
      select: { id: true },
    })
    // Another org's campaign is indistinguishable from one that doesn't exist.
    if (!own) return { error: jsonError("Not found", 404) }
  }

  return { scope: { orgId, canSeeMoney, range: range.range, filters: filters.filters } }
}

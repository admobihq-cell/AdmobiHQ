import { NextResponse } from "next/server"

import { listStatements } from "@/lib/analytics/finance-queries"
import { requireCustomerPermissionAccess } from "@/lib/api-utils"

/**
 * One statement per month that has ledger rows, oldest first. Each closing is the next
 * month's opening, and the last closing equals the balance. Needs `billing:read`. Read-only.
 */
export async function GET() {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  return NextResponse.json({ items: await listStatements(auth.access.orgId) })
}

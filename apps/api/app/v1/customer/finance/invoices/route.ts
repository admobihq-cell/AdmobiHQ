import { NextResponse } from "next/server"

import { listInvoices } from "@/lib/analytics/finance-queries"
import { requireCustomerPermissionAccess } from "@/lib/api-utils"

/** The org's invoices, newest first. Needs `billing:read`. Read-only. */
export async function GET() {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  return NextResponse.json({ items: await listInvoices(auth.access.orgId) })
}

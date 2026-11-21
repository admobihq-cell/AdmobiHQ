import { NextResponse } from "next/server"

import { requireCustomerPermissionAccess } from "@/lib/api-utils"
import { listCustomerBillingDocuments } from "@/lib/billing/documents"

/** Quotes and invoices ops has sent to this org (never drafts), newest first. Needs `billing:read`. */
export async function GET() {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  return NextResponse.json({ items: await listCustomerBillingDocuments(auth.access.orgId) })
}

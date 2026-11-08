import { NextResponse } from "next/server"

import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { refreshPayment } from "@/lib/payments/start-checkout"

type Params = { params: Promise<{ reference: string }> }

/** Polled by the payment return page and the mobile app after checkout. */
export async function GET(_req: Request, { params }: Params) {
  let auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) auth = await requireCustomerPermissionAccess("campaigns:submit")
  if (auth.error) return auth.error

  const { reference } = await params
  if (!/^adm-pay-[0-9a-f]{12}$/.test(reference)) return jsonError("Not found", 404)

  const view = await refreshPayment(reference, auth.access.orgId)
  if (!view) return jsonError("Not found", 404)
  return NextResponse.json(view)
}

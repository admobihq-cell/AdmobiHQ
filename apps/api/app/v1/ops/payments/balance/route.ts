import { NextResponse } from "next/server"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { getKesBalance } from "@/lib/payments/paystack"

export const dynamic = "force-dynamic"

/** Live Paystack KES balance for the ops Finances overview and the Disburse check. */
export async function GET() {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  try {
    return NextResponse.json({ balanceKes: await getKesBalance() })
  } catch (error) {
    console.error("[ops/payments/balance]", error)
    return jsonError("Couldn't reach Paystack", 502)
  }
}

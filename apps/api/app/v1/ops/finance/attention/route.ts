import { NextResponse } from "next/server"

import { queryPaymentsNeedingAttention } from "@workspace/ops-queries"

import { requireOpsPermissionAccess } from "@/lib/api-utils"
import { opsDb } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

/** Ops Finances, attention. Needs the `finances` permission: every figure is money. */
export async function GET() {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  return NextResponse.json(await queryPaymentsNeedingAttention(opsDb()))
}

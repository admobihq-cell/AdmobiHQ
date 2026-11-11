import { NextResponse } from "next/server"

import { queryFinanceLedger } from "@workspace/ops-queries"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { opsDb, readRange } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

/** Ops Finances, ledger tab. Needs the `finances` permission: every figure is money. */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const range = readRange(req)
  if (!range) return jsonError("Invalid range", 400)
  return NextResponse.json(await queryFinanceLedger(opsDb(), range))
}

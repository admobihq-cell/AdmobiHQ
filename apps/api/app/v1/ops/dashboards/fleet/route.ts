import { NextResponse } from "next/server"

import { queryFleet } from "@workspace/ops-queries"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { can, opsDb, readRange } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

/** Ops Fleet dashboard. Needs `drivers`. Payout money is only present for a viewer who also holds `finances`. */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("drivers")
  if (auth.error) return auth.error

  const range = readRange(req)
  if (!range) return jsonError("Invalid range", 400)
  return NextResponse.json(await queryFleet(opsDb(), range, can(auth.access, "finances")))
}

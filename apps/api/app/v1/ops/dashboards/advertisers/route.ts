import { NextResponse } from "next/server"

import { queryAdvertisers } from "@workspace/ops-queries"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { can, opsDb, readRange } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

/** Ops Advertisers dashboard. Needs `campaigns`. Spend figures are only present for a viewer who also holds `finances`. */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const range = readRange(req)
  if (!range) return jsonError("Invalid range", 400)
  return NextResponse.json(await queryAdvertisers(opsDb(), range, can(auth.access, "finances")))
}

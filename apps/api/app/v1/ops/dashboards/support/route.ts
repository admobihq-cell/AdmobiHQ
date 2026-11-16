import { NextResponse } from "next/server"

import { querySupport } from "@workspace/ops-queries"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { can, opsDb, readRange } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

/** Ops Support dashboard. Needs `support`. The driver-safety section is only present for a viewer who also holds `safety`. */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("support")
  if (auth.error) return auth.error

  const range = readRange(req)
  if (!range) return jsonError("Invalid range", 400)
  return NextResponse.json(await querySupport(opsDb(), range, can(auth.access, "safety")))
}

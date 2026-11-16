import { NextResponse } from "next/server"

import { queryDelivery, queryInventory, queryPipeline } from "@workspace/ops-queries"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { can, opsDb, readRange } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

const TABS = ["pipeline", "delivery", "inventory"] as const

/**
 * Ops Campaigns dashboard, one tab at a time (`?tab=pipeline|delivery|inventory`, default pipeline).
 * Needs `campaigns`. Money (booked value, budget by format) is only computed for a viewer who also holds
 * `finances`: without it the figures are null in the response, never just hidden on screen.
 */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const range = readRange(req)
  if (!range) return jsonError("Invalid range", 400)
  const tab = new URL(req.url).searchParams.get("tab") ?? "pipeline"
  if (!(TABS as readonly string[]).includes(tab)) return jsonError("Invalid tab", 400)

  const money = can(auth.access, "finances")
  const db = opsDb()
  if (tab === "delivery") return NextResponse.json(await queryDelivery(db, range))
  if (tab === "inventory") return NextResponse.json(await queryInventory(db, range, money))
  return NextResponse.json(await queryPipeline(db, range, money))
}

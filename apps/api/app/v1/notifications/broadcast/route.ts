import { NextResponse } from "next/server"

import { broadcastCreateSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { requireOpsUser } from "@/lib/auth"
import { broadcastToCustomers } from "@/lib/push/broadcast-customers"

export const maxDuration = 60

export async function POST(req: Request) {
  let access
  try {
    access = await requireOpsUser()
  } catch (e) {
    if (e instanceof Response) return e
    return jsonError("Unauthorized", 401)
  }

  const parsed = await parseJsonBody(req, broadcastCreateSchema)
  if ("error" in parsed) return parsed.error

  try {
    const broadcast = await broadcastToCustomers(parsed.data, {
      clerkUserId: access.userId,
      email: access.email,
    })

    await auditFromOpsUser(access, {
      action: "broadcast",
      entity_type: "announcement",
      entity_id: broadcast.id,
      summary: `Broadcast "${broadcast.title}" to ${broadcast.target_count} devices`,
    })

    return NextResponse.json(broadcast, { status: 201 })
  } catch (error) {
    console.error("[notifications/broadcast]", error)
    return jsonError("Failed to send broadcast", 500)
  }
}

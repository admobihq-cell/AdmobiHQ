import { NextResponse } from "next/server"

import { broadcastCreateSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser, recordAuditEvent } from "@/lib/audit"
import { jsonError, parseJsonBody, timingSafeEqual } from "@/lib/api-utils"
import { requireOpsUser } from "@/lib/auth"
import { broadcastAnnouncement } from "@/lib/push/broadcast-announcement"

export const maxDuration = 60

/** Release scripts (e.g. the OTA-update notifier) send `Authorization: Bearer $CRON_SECRET`,
 * same as Vercel Cron — see push-receipts/check for the original use of this pattern. */
function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return timingSafeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)
}

const SYSTEM_SENDER = { clerkUserId: "system", email: "release-bot@admobihq.com" }

export async function POST(req: Request) {
  const isSystemCaller = hasCronSecret(req)

  let access: Awaited<ReturnType<typeof requireOpsUser>> | null = null
  if (!isSystemCaller) {
    try {
      access = await requireOpsUser()
    } catch (e) {
      if (e instanceof Response) return e
      return jsonError("Unauthorized", 401)
    }
  }

  const parsed = await parseJsonBody(req, broadcastCreateSchema)
  if ("error" in parsed) return parsed.error

  try {
    const broadcast = await broadcastAnnouncement(
      parsed.data,
      access ? { clerkUserId: access.userId, email: access.email } : SYSTEM_SENDER,
    )

    if (access) {
      await auditFromOpsUser(access, {
        action: "broadcast",
        entity_type: "announcement",
        entity_id: broadcast.id,
        summary: `Broadcast "${broadcast.title}" to ${broadcast.target_count} devices`,
      })
    } else {
      await recordAuditEvent({
        app: "api",
        actor_type: "system",
        actor_user_id: null,
        actor_email: SYSTEM_SENDER.email,
        action: "broadcast",
        entity_type: "announcement",
        entity_id: broadcast.id,
        summary: `Broadcast "${broadcast.title}" to ${broadcast.target_count} devices (automated OTA release notice)`,
      })
    }

    return NextResponse.json(broadcast, { status: 201 })
  } catch (error) {
    console.error("[notifications/broadcast]", error)
    return jsonError("Failed to send broadcast", 500)
  }
}

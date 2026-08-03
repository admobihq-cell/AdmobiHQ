import { NextResponse } from "next/server"

import { jsonError, timingSafeEqual } from "@/lib/api-utils"
import { getOpsUser } from "@/lib/auth"
import { checkPendingPushReceipts } from "@/lib/push/receipts"

export const maxDuration = 60
export const dynamic = "force-dynamic"

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return timingSafeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)
}

async function handle(req: Request) {
  if (!hasCronSecret(req) && !(await getOpsUser())) {
    return jsonError("Unauthorized", 401)
  }

  try {
    const summary = await checkPendingPushReceipts()
    return NextResponse.json(summary)
  } catch (error) {
    console.error("[push-receipts/check]", error)
    return jsonError("Failed to check push receipts", 500)
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}

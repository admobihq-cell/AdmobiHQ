import { NextResponse } from "next/server"

import { jsonError, timingSafeEqual } from "@/lib/api-utils"
import { getOpsUser } from "@/lib/auth"
import { runFinanceDaily } from "@/lib/payments/finance-daily"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return timingSafeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)
}

/** Nightly at 00:30 Nairobi: reconcile payments, write spend, release credit, digest. */
async function handle(req: Request) {
  if (!hasCronSecret(req) && !(await getOpsUser())) {
    return jsonError("Unauthorized", 401)
  }

  try {
    return NextResponse.json(await runFinanceDaily())
  } catch (error) {
    console.error("[cron/finance-daily]", error)
    return jsonError("Finance cron failed", 500)
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}

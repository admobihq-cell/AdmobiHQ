import { NextResponse } from "next/server"

import { countUnseenPayments, markPaymentsSeen } from "@workspace/ops-queries"

import { requireOpsPermissionAccess } from "@/lib/api-utils"
import { opsDb } from "@/lib/ops-db"

export const dynamic = "force-dynamic"

/** Settled Paystack payments nobody in ops has looked at yet: the Finances badge. */
export async function GET() {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  return NextResponse.json({ count: await countUnseenPayments(opsDb()) })
}

/** Opening the Ledger stamps every unseen payment as seen and clears the badge. */
export async function POST() {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  return NextResponse.json({ marked: await markPaymentsSeen(opsDb()) })
}

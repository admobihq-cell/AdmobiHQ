import { NextResponse } from "next/server"
import { z } from "zod"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { disburse, InsufficientBalanceError } from "@/lib/payments/payouts"

export const maxDuration = 300

const disburseSchema = z.object({ payoutIds: z.array(z.number().int().positive()).min(1).max(1000) })

/** Disburse: send the selected payouts through Paystack Transfers. Needs `payouts`, not just `finances`. */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("payouts")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, disburseSchema)
  if ("error" in parsed) return parsed.error

  try {
    const result = await disburse(parsed.data.payoutIds, auth.access.email)
    await auditFromOpsUser(auth.access, {
      action: "update",
      entity_type: "payout",
      entity_id: null,
      summary: `Disbursed ${result.queued} driver payout(s) through Paystack (${result.skipped.length} skipped)`,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: error.message, balanceKes: error.balanceKes, requiredKes: error.requiredKes },
        { status: 402 },
      )
    }
    console.error("[ops/payouts/disburse]", error)
    return jsonError("Couldn't send the payouts", 502)
  }
}

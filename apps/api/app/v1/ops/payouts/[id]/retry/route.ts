import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { disburse, InsufficientBalanceError } from "@/lib/payments/payouts"

type Params = { params: Promise<{ id: string }> }

/** Resend a failed payout with the same reference, which Paystack treats as idempotent. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("payouts")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  try {
    const result = await disburse([id], auth.access.email)
    if (!result.queued) return jsonError(result.skipped[0]?.reason ?? "Payout can't be retried", 409)
    await auditFromOpsUser(auth.access, {
      action: "update",
      entity_type: "payout",
      entity_id: id,
      summary: `Retried driver payout #${id} through Paystack`,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: error.message, balanceKes: error.balanceKes, requiredKes: error.requiredKes },
        { status: 402 },
      )
    }
    console.error("[ops/payouts/retry]", error)
    return jsonError("Couldn't retry the payout", 502)
  }
}

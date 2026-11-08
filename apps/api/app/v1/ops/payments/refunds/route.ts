import { NextResponse } from "next/server"
import { z } from "zod"

import { formatKes } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { refundCredit } from "@/lib/payments/refunds"

const refundSchema = z.object({
  orgId: z.number().int().positive(),
  amountKes: z.number().positive().max(10_000_000),
  reason: z.string().trim().min(3).max(500),
})

/** Ops refunds unused credit to the org's original Paystack payments (spec §5.5). */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error
  const { access } = auth

  const parsed = await parseJsonBody(req, refundSchema)
  if ("error" in parsed) return parsed.error
  const { orgId, amountKes, reason } = parsed.data

  let result
  try {
    result = await refundCredit({ orgId, amountKes, reason, opsEmail: access.email })
  } catch (error) {
    if (error instanceof RangeError) return jsonError(error.message, 409)
    throw error
  }

  await auditFromOpsUser(access, {
    action: "create",
    entity_type: "refund",
    entity_id: result.refundIds[0] ?? null,
    org_id: orgId,
    summary: `Refunded ${formatKes(amountKes)} to payer across ${result.refundIds.length} payment(s) (${reason})`,
  })

  return NextResponse.json(result, { status: 201 })
}

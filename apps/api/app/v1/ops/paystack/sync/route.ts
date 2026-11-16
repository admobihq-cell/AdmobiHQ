import { NextResponse } from "next/server"
import { z } from "zod"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { reconcileRefunds } from "@/lib/payments/refunds"
import { settlePayment } from "@/lib/payments/settle-payment"

export const dynamic = "force-dynamic"

const bodySchema = z.union([
  z.object({ reference: z.string().regex(/^adm-pay-[a-z0-9]{1,40}$/) }),
  z.object({ refunds: z.literal(true) }),
])

/**
 * Pull Paystack's truth into our rows on demand. `{ reference }` re-checks one payment through
 * `settlePayment` (verifies with Paystack, credits once, never creates a payment we don't have).
 * `{ refunds: true }` imports the last 30 days of Paystack refunds, as the nightly run does.
 */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, bodySchema)
  if ("error" in parsed) return parsed.error

  try {
    if ("reference" in parsed.data) {
      const { reference } = parsed.data
      const result = await settlePayment(reference)
      if (result === "settled") {
        await auditFromOpsUser(auth.access, {
          action: "update",
          entity_type: "payment",
          entity_id: null,
          summary: `Synced Paystack payment ${reference}: credited`,
        })
      }
      return NextResponse.json({ result })
    }
    const { imported } = await reconcileRefunds()
    if (imported > 0) {
      await auditFromOpsUser(auth.access, {
        action: "create",
        entity_type: "refund",
        entity_id: null,
        summary: `Imported ${imported} refund(s) made in the Paystack dashboard`,
      })
    }
    return NextResponse.json({ imported })
  } catch (error) {
    console.error("[ops/paystack/sync]", error)
    return jsonError("Couldn't reach Paystack", 502)
  }
}

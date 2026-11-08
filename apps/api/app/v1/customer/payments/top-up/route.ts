import { NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { checkoutErrorResponse } from "@/lib/payments/checkout-errors"
import { payerEmail, startCheckout } from "@/lib/payments/start-checkout"

const topUpSchema = z.object({ amountKes: z.number().int().min(100).max(1_000_000) })

/** Standalone balance top-up through Paystack (spec §5.2). */
export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("billing:write")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, topUpSchema)
  if ("error" in parsed) return parsed.error

  const email = await payerEmail(auth.access.userId, auth.access.orgId)
  if (!email) return jsonError("Add an email address to your account before paying", 400)

  try {
    return NextResponse.json(
      await startCheckout({
        orgId: auth.access.orgId,
        campaignId: null,
        amountKes: parsed.data.amountKes,
        userId: auth.access.userId,
        email,
      }),
    )
  } catch (error) {
    return checkoutErrorResponse(error)
  }
}

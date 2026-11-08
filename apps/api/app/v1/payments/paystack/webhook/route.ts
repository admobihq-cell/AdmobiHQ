import { NextResponse } from "next/server"

import { jsonError } from "@/lib/api-utils"
import { verifyWebhookSignature } from "@/lib/payments/paystack"
import { settlePayment } from "@/lib/payments/settle-payment"

export const dynamic = "force-dynamic"

type PaystackEvent = { event?: string; data?: { reference?: string } & Record<string, unknown> }

/**
 * Paystack webhook (spec §11). The signature is the HMAC-SHA512 of the RAW
 * body, so read text before parsing. Nothing in the payload is trusted beyond
 * the reference: every handler re-reads our own rows and re-verifies with
 * Paystack. A throwing handler answers 500 so Paystack retries (up to 72 h).
 * ponytail: legacy x-paystack-signature; move to Paystack-Signature (whsec_) when the dashboard issues one.
 */
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim()
  const raw = await req.text()
  if (!secret || !verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"), secret)) {
    console.warn("[paystack/webhook] rejected: bad or missing signature")
    return jsonError("Invalid signature", 401)
  }

  let payload: PaystackEvent
  try {
    payload = JSON.parse(raw) as PaystackEvent
  } catch {
    return jsonError("Invalid JSON", 400)
  }

  try {
    switch (payload.event) {
      case "charge.success": {
        const reference = payload.data?.reference
        if (typeof reference !== "string") return jsonError("Missing reference", 400)
        return NextResponse.json({ result: await settlePayment(reference) })
      }
      default:
        return NextResponse.json({ ignored: true })
    }
  } catch (error) {
    console.error(`[paystack/webhook] ${payload.event} failed:`, error)
    return jsonError("Webhook handler failed", 500)
  }
}

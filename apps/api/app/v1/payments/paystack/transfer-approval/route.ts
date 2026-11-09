import { after, NextResponse } from "next/server"

import { alertOpsFinance } from "@/lib/payments/money-notify"
import { approveTransfer } from "@/lib/payments/payouts"
import { paystackSecretKey, verifyWebhookSignature } from "@/lib/payments/paystack"

export const dynamic = "force-dynamic"

/**
 * Paystack asks before sending every transfer (spec §8.4). We say yes only to a
 * payout we queued ourselves, with the exact amount, so a leaked secret key
 * can't send money anywhere else. It must answer within seconds: one indexed
 * lookup, no Paystack call, and the alert runs after the response.
 * Paystack doesn't document whether these requests are signed; a signature
 * that is present must be valid.
 */
export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get("x-paystack-signature")
  const secret = paystackSecretKey() ?? ""

  let body: unknown = {}
  try {
    body = JSON.parse(raw)
  } catch {
    // Unparseable: denied below.
  }

  const signatureOk = signature == null || (secret !== "" && verifyWebhookSignature(raw, signature, secret))
  if (signatureOk && (await approveTransfer(body))) return new NextResponse(null, { status: 200 })

  const first = (Array.isArray(body) ? body[0] : body) as { reference?: unknown } | null
  const reference = typeof first?.reference === "string" ? first.reference : "no reference"
  after(() =>
    alertOpsFinance({
      title: `Blocked an unknown Paystack transfer (${reference})`,
      body: "Someone asked Paystack to send money we didn't queue. Check who has the secret key and rotate it.",
      email: true,
    }),
  )
  return new NextResponse(null, { status: 400 })
}

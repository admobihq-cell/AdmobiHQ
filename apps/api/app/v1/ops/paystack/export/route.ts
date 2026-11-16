import { NextResponse } from "next/server"
import { z } from "zod"

import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { paystackGet } from "@/lib/payments/paystack"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.string().regex(/^[a-z_-]{1,30}$/).optional(),
})

/** Paystack's own transaction CSV export. Returns a short-lived download link Paystack hosts. */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, bodySchema)
  if ("error" in parsed) return parsed.error

  const p = new URLSearchParams({ currency: "KES" })
  for (const [k, v] of Object.entries(parsed.data)) if (v) p.set(k, v)
  try {
    const { path } = await paystackGet<{ path: string }>(`/transaction/export?${p}`)
    return NextResponse.json({ url: path })
  } catch (error) {
    console.error("[ops/paystack/export]", error)
    return jsonError("Couldn't reach Paystack", 502)
  }
}

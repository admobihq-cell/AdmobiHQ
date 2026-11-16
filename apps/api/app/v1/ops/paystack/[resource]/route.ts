import { NextResponse } from "next/server"
import { z } from "zod"

import { PAYSTACK_RESOURCES } from "@workspace/ops-contracts"

import { jsonError, requireOpsPermissionAccess } from "@/lib/api-utils"
import { listPaystack, paystackSummary } from "@/lib/payments/paystack-ops"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ resource: string }> }

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.string().regex(/^[a-z_-]{1,30}$/).optional(),
  reference: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(200).optional(),
})

/** Live Paystack lists for the ops Finances → Paystack tab: `summary` or one of PAYSTACK_RESOURCES. */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const { resource } = await params
  const raw = Object.fromEntries(new URL(req.url).searchParams)
  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) return jsonError("Invalid query", 400)
  const q = parsed.data

  try {
    if (resource === "summary") return NextResponse.json(await paystackSummary(q.from, q.to))
    const list = PAYSTACK_RESOURCES.find((r) => r === resource)
    if (!list) return jsonError("Unknown Paystack resource", 404)
    return NextResponse.json(await listPaystack(list, q))
  } catch (error) {
    console.error(`[ops/paystack/${resource}]`, error)
    return jsonError("Couldn't reach Paystack", 502)
  }
}

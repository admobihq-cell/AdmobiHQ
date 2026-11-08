import { NextResponse } from "next/server"
import { z } from "zod"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { eligibleDriverProfiles, estimateTransferFeeKes, savePayoutRun } from "@/lib/payments/payouts"
import { prisma } from "@/lib/prisma"

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

const mask = (value: string | null) => (value && value.length >= 4 ? `•••• ${value.slice(-4)}` : value ? "••••" : null)

/** A month's payout run: every eligible driver, with the row saved for them if any. */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const month = new URL(req.url).searchParams.get("month") ?? ""
  if (!MONTH.test(month)) return jsonError("month must be YYYY-MM", 400)
  const periodMonth = new Date(`${month}-01T00:00:00Z`)

  const [profiles, payouts] = await Promise.all([
    eligibleDriverProfiles(),
    prisma.payout.findMany({ where: { period_month: periodMonth, driver_profile_id: { not: null } } }),
  ])
  const byProfile = new Map(payouts.map((p) => [p.driver_profile_id!, p]))

  return NextResponse.json({
    month,
    drivers: profiles.map((p) => {
      const method = p.payout_method === "bank" ? "bank" : "mpesa"
      const payout = byProfile.get(p.id)
      return {
        driverProfileId: p.id,
        name: p.full_name ?? `Driver #${p.id}`,
        method,
        destinationMasked: mask(method === "mpesa" ? p.payout_mpesa_msisdn : p.payout_bank_account),
        bankName: method === "bank" ? p.payout_bank_name : null,
        payout: payout
          ? {
              id: payout.id,
              amountKes: Number(payout.amount_kes),
              status: payout.status,
              failureReason: payout.failure_reason,
              estimatedFeeKes: estimateTransferFeeKes(method, Number(payout.amount_kes)),
            }
          : null,
      }
    }),
  })
}

const runSchema = z.object({
  periodMonth: z.string().regex(MONTH),
  items: z
    .array(z.object({ driverProfileId: z.number().int().positive(), amountKes: z.number().positive().max(1_000_000) }))
    .min(1)
    .max(1000),
})

/** Save typed amounts as `pending` payouts. They can be edited until disbursed. */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, runSchema)
  if ("error" in parsed) return parsed.error

  const result = await savePayoutRun(parsed.data.periodMonth, parsed.data.items, auth.access.email)
  await auditFromOpsUser(auth.access, {
    action: "update",
    entity_type: "payout",
    entity_id: null,
    summary: `Saved ${result.saved} pending driver payout(s) for ${parsed.data.periodMonth}`,
  })
  return NextResponse.json(result)
}

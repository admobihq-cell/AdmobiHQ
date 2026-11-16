import { NextResponse } from "next/server"

import { nairobiDay, type DriverPayoutsDto } from "@workspace/ops-contracts"

import { requireDriverAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

const roundKes = (value: number) => Math.round(value * 100) / 100

/** The caller's own payouts. Only real payout rows: there is no per-day earnings source yet. */
export async function GET() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const payouts = await prisma.payout.findMany({
    where: { driverProfile: { clerk_user_id: auth.access.userId } },
    orderBy: [{ period_month: "desc" }, { id: "desc" }],
    take: 120,
  })

  const year = nairobiDay(new Date()).slice(0, 4)
  const settled = payouts.filter((p) => p.status === "settled" && p.paid_at)
  const last = settled.reduce<(typeof settled)[number] | null>(
    (latest, p) => (!latest || p.paid_at! > latest.paid_at! ? p : latest),
    null,
  )

  const body: DriverPayoutsDto = {
    items: payouts.map((p) => ({
      id: p.id,
      periodMonth: p.period_month.toISOString().slice(0, 7),
      amountKes: Number(p.amount_kes),
      status: p.status,
      paidAt: p.paid_at?.toISOString() ?? null,
    })),
    summary: {
      lastPayout: last ? { amountKes: Number(last.amount_kes), paidAt: last.paid_at!.toISOString() } : null,
      paidThisYearKes: roundKes(
        settled.filter((p) => nairobiDay(p.paid_at!).startsWith(year)).reduce((sum, p) => sum + Number(p.amount_kes), 0),
      ),
      pendingKes: roundKes(
        payouts.filter((p) => p.status === "pending" || p.status === "processing").reduce((sum, p) => sum + Number(p.amount_kes), 0),
      ),
    },
  }
  return NextResponse.json(body)
}

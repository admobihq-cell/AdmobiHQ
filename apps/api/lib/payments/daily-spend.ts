import { nairobiDay, toDayIso } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"

const DAY_MS = 86_400_000
const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * DAY_MS).toISOString().slice(0, 10)
const daysBetweenInclusive = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS) + 1

/** Nairobi calendar day before `today`. */
export const nairobiYesterday = (today: Date = new Date()) => addDays(nairobiDay(today), -1)

/**
 * Straight-line spend (spec §5.4): budget ÷ flight days per day, cents-rounded,
 * the last flight day taking the remainder. Only days from the approval day to
 * yesterday are written, so days before approval are never charged and their
 * share becomes credit when the flight ends.
 * ponytail: straight-line spend; switch to plays_delivered × rate once telemetry is real.
 */
export function dailySpendRows(
  c: { id: number; budgetKes: number; startsOn: string; endsOn: string; approvedOn: string },
  existing: Set<string>,
  yesterday: string,
): { reference: string; day: string; amountKes: number }[] {
  const flightDays = daysBetweenInclusive(c.startsOn, c.endsOn)
  if (flightDays < 1) return []
  const budgetCents = Math.round(c.budgetKes * 100)
  const perDayCents = Math.round(budgetCents / flightDays)
  const lastDayCents = budgetCents - perDayCents * (flightDays - 1)

  const first = c.approvedOn > c.startsOn ? c.approvedOn : c.startsOn
  const last = c.endsOn < yesterday ? c.endsOn : yesterday
  const rows: { reference: string; day: string; amountKes: number }[] = []
  for (let day = first; day <= last; day = addDays(day, 1)) {
    const reference = `spend-c${c.id}-${day}`
    if (existing.has(reference)) continue
    rows.push({ reference, day, amountKes: (day === c.endsOn ? lastDayCents : perDayCents) / 100 })
  }
  return rows
}

/** One `spend` row per approved, funded campaign per elapsed flight day. Idempotent. */
export async function writeDailySpend(today: Date = new Date()): Promise<{ rows: number }> {
  const yesterday = nairobiYesterday(today)
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "approved",
      funded_at: { not: null },
      budget_kes: { not: null },
      starts_on: { not: null, lte: new Date(yesterday) },
      ends_on: { not: null },
      org_id: { not: null },
    },
    select: { id: true, name: true, org_id: true, budget_kes: true, starts_on: true, ends_on: true, reviewed_at: true },
  })

  let written = 0
  for (const c of campaigns) {
    const existing = await prisma.walletTransaction.findMany({
      where: { reference: { startsWith: `spend-c${c.id}-` } },
      select: { reference: true },
    })
    const startsOn = toDayIso(c.starts_on!)
    const rows = dailySpendRows(
      {
        id: c.id,
        budgetKes: Number(c.budget_kes),
        startsOn,
        endsOn: toDayIso(c.ends_on!),
        approvedOn: c.reviewed_at ? nairobiDay(c.reviewed_at) : startsOn,
      },
      new Set(existing.map((r) => r.reference!)),
      yesterday,
    )
    if (!rows.length) continue
    const { count } = await prisma.walletTransaction.createMany({
      data: rows.map((r) => ({
        org_id: c.org_id,
        campaign_id: c.id,
        kind: "spend",
        spend_category: "screen_time",
        amount_kes: -r.amountKes,
        provider: "paystack",
        reference: r.reference,
        description: `Screen time: ${c.name}, ${r.day}`,
        // Noon Nairobi (09:00 UTC) sits squarely inside the Nairobi day.
        occurred_at: new Date(`${r.day}T09:00:00Z`),
      })),
      skipDuplicates: true,
    })
    written += count
  }
  return { rows: written }
}

import type { Campaign, Prisma } from "@prisma/client"

import { dueNowKes, nairobiDay, toDayIso } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"

export { dueNowKes }

/** Statuses in which a funded campaign's unspent budget is held (spec §5.4). */
export const HOLDING_STATUSES: ReadonlySet<string> = new Set(["submitted", "approved", "changes_requested"])

const roundKes = (value: number) => Math.round(value * 100) / 100

/** Funded, in a holding status, and the flight hasn't finished (its last day, in Nairobi, still holds). */
export function holdsFunds(
  c: Pick<Campaign, "funded_at" | "status" | "starts_on" | "ends_on">,
  today: Date = new Date()
): boolean {
  return (
    c.funded_at != null &&
    HOLDING_STATUSES.has(c.status) &&
    (c.ends_on == null || toDayIso(c.ends_on) >= nairobiDay(today))
  )
}

/** Serialises money decisions per org. Call first in the transaction, before `availableKes`. */
export async function lockOrg(tx: Prisma.TransactionClient, orgId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM advertiser_orgs WHERE id = ${orgId} FOR UPDATE`
}

/**
 * Ledger balance minus the unspent budget of every campaign that holds funds. Not clamped:
 * a negative result means the org owes money, which `dueNowKes` adds to what is due. Spent is net of
 * refunds, the same definition as `spentByCampaign` in finance-queries.ts. The caller must hold `lockOrg`.
 */
export async function availableKes(tx: Prisma.TransactionClient, orgId: number, today: Date = new Date()): Promise<number> {
  const [[ledger], campaigns, spentRows] = await Promise.all([
    tx.$queryRaw<{ balance: number | null }[]>`
      SELECT COALESCE(SUM(amount_kes), 0)::float8 AS balance FROM wallet_transactions WHERE org_id = ${orgId}`,
    tx.campaign.findMany({
      where: { org_id: orgId, funded_at: { not: null } },
      select: { id: true, funded_at: true, status: true, starts_on: true, ends_on: true, budget_kes: true },
    }),
    tx.$queryRaw<{ campaign_id: number; spent: number }[]>`
      SELECT campaign_id, (-SUM(amount_kes))::float8 AS spent
      FROM wallet_transactions
      WHERE org_id = ${orgId} AND campaign_id IS NOT NULL AND kind IN ('spend', 'refund')
      GROUP BY campaign_id`,
  ])
  const spent = new Map(spentRows.map((r) => [r.campaign_id, Number(r.spent)]))
  const held = campaigns
    .filter((c) => holdsFunds(c, today))
    .reduce((sum, c) => sum + Math.max(0, Number(c.budget_kes ?? 0) - (spent.get(c.id) ?? 0)), 0)
  return roundKes(Number(ledger?.balance ?? 0) - held)
}

/** Budget minus spend net of refunds for one campaign, cents-rounded; what a release hands back. */
export async function unspentBudgetKes(campaignId: number, budgetKes: number): Promise<number> {
  const spent = await prisma.walletTransaction.aggregate({
    where: { campaign_id: campaignId, kind: { in: ["spend", "refund"] } },
    _sum: { amount_kes: true },
  })
  return roundKes(budgetKes + Number(spent._sum.amount_kes ?? 0))
}

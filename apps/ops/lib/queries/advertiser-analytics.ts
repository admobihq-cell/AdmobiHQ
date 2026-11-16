import { unstable_cache } from "next/cache"

import {
  buildAdvertiserDashboard,
  nairobiDay,
  resolveReportRange,
  type AdvertiserDashboardDto,
  type AdvertiserOrgRaw,
  type DateRangeKey,
  type FundingLevel,
} from "@workspace/ops-contracts"

import { getPgPool } from "@/lib/pg"
import { queryFinanceWallets } from "@/lib/queries/finance"

/**
 * The ops Advertisers dashboard. The caller has already checked the same permission as
 * /advertiser-orgs. Money (spend, balances, funding) is selected only when `includeMoney` is true,
 * and `buildAdvertiserDashboard` strips it again, so a viewer without `finances` gets counts and
 * campaign activity only. The two variants are cached under separate keys.
 */

const NAIROBI = (col: string) => `(${col} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date`
const num = (value: unknown) => (value == null ? 0 : Number(value))

type OrgRow = {
  id: number
  name: string
  created_day: string
  contact: string | null
  campaign_count: number
  live: number
  rejected: number
  days_since: number
  last_campaign: string | null
}

type SpendRow = { org_id: number; current: number; previous: number }

export async function queryAdvertisers(
  range: DateRangeKey,
  includeMoney: boolean
): Promise<AdvertiserDashboardDto & { window: { start: string; end: string } }> {
  const w = resolveReportRange({ range }, new Date())
  const today = nairobiDay(new Date())
  const pool = getPgPool()

  const [orgs, spend, wallets] = await Promise.all([
    pool.query<OrgRow>(
      `SELECT o.id, o.name, to_char(${NAIROBI("o.created_at")}, 'YYYY-MM-DD') AS created_day,
         (SELECT COALESCE(NULLIF(c2.contact_name, ''), c2.contact_email) FROM campaigns c2
          WHERE c2.org_id = o.id AND (c2.contact_name IS NOT NULL OR c2.contact_email IS NOT NULL)
          ORDER BY c2.created_at DESC LIMIT 1) AS contact,
         COUNT(c.id) FILTER (WHERE c.status NOT IN ('draft', 'cancelled'))::int AS campaign_count,
         COUNT(c.id) FILTER (WHERE c.status = 'approved' AND c.starts_on <= $3::date AND c.ends_on >= $3::date)::int AS live,
         COUNT(c.id) FILTER (WHERE c.status IN ('rejected', 'changes_requested')
                             AND ${NAIROBI("c.reviewed_at")} BETWEEN $1::date AND $2::date)::int AS rejected,
         ($3::date - ${NAIROBI("COALESCE(MAX(c.created_at), o.created_at)")})::int AS days_since,
         (SELECT c3.name FROM campaigns c3 WHERE c3.org_id = o.id ORDER BY c3.created_at DESC LIMIT 1) AS last_campaign
       FROM advertiser_orgs o LEFT JOIN campaigns c ON c.org_id = o.id
       GROUP BY o.id, o.name, o.created_at ORDER BY o.id`,
      [w.start, w.end, today]
    ),
    includeMoney
      ? pool.query<SpendRow>(
          `SELECT t.org_id,
             (-COALESCE(SUM(t.amount_kes) FILTER (WHERE ${NAIROBI("t.occurred_at")} BETWEEN $1::date AND $2::date), 0))::float8 AS current,
             (-COALESCE(SUM(t.amount_kes) FILTER (WHERE ${NAIROBI("t.occurred_at")} BETWEEN $3::date AND $4::date), 0))::float8 AS previous
           FROM wallet_transactions t
           WHERE t.org_id IS NOT NULL AND t.kind IN ('spend', 'refund') AND t.spend_category IS DISTINCT FROM 'tax'
           GROUP BY t.org_id`,
          [w.start, w.end, w.previous?.start ?? w.start, w.previous?.end ?? w.start]
        )
      : Promise.resolve(null),
    includeMoney ? queryFinanceWallets() : Promise.resolve(null),
  ])

  const spendByOrg = new Map((spend?.rows ?? []).map((r) => [r.org_id, r]))
  const walletByOrg = new Map((wallets ?? []).map((r) => [r.orgId, r]))

  const raw: AdvertiserOrgRaw[] = orgs.rows.map((o) => {
    const base: AdvertiserOrgRaw = {
      orgId: o.id,
      name: o.name,
      contact: o.contact,
      createdDay: o.created_day,
      campaignCount: num(o.campaign_count),
      liveCampaigns: num(o.live),
      rejectedCampaigns: num(o.rejected),
      daysSinceLastCampaign: Math.max(0, num(o.days_since)),
      lastCampaignName: o.last_campaign,
    }
    if (!includeMoney) return base
    const s = spendByOrg.get(o.id)
    const wallet = walletByOrg.get(o.id)
    const funding: FundingLevel = wallet ? (wallet.status === "short" ? "short" : "healthy") : "untracked"
    return {
      ...base,
      spendKes: Math.round(num(s?.current) * 100) / 100,
      previousSpendKes: w.previous ? Math.round(num(s?.previous) * 100) / 100 : null,
      balanceKes: wallet?.balanceKes ?? null,
      funding,
    }
  })

  const start = range === "all" ? (raw.map((o) => o.createdDay).sort()[0] ?? w.end) : w.start
  return { ...buildAdvertiserDashboard(raw, { includeMoney, window: { start, end: w.end } }), window: { start, end: w.end } }
}

export const getAdvertisers = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(
    () => queryAdvertisers(range, includeMoney),
    ["ops-advertisers", range, includeMoney ? "money" : "no-money"],
    { revalidate: 300 }
  )()

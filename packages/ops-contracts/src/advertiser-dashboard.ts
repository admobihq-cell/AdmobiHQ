import { accountHealth, DORMANT_DAYS, type AccountBlocker, type FundingLevel } from "./health"
import { delta, foldOther, type DailyPoint, type Delta, type NamedValue } from "./analytics"

/**
 * Shapes the ops Advertisers dashboard from raw per-organization rows.
 *
 * Money (spend, balance, revenue share, funding) is only ever added when `includeMoney` is true,
 * and with it false the result contains no money keys at all, not nulls. The query layer also
 * skips fetching money, so this is a second lock, and it is the part tests can pin down.
 */

export type AdvertiserOrgRaw = {
  orgId: number
  name: string
  /** The advertiser contact on their latest campaign: customer names live in a separate identity provider. */
  contact: string | null
  /** YYYY-MM-DD */
  createdDay: string
  /** Campaigns that are not draft or canceled. */
  campaignCount: number
  liveCampaigns: number
  /** Rejected or changes-requested in the period. */
  rejectedCampaigns: number
  /** Whole days since the latest campaign was created, or since the org was if it has none. */
  daysSinceLastCampaign: number
  lastCampaignName: string | null
  // Money. The query only selects these for viewers who hold `finances`.
  spendKes?: number
  previousSpendKes?: number | null
  balanceKes?: number | null
  funding?: FundingLevel | null
}

export type AtRiskRow = {
  orgId: number
  name: string
  contact: string | null
  blocker: AccountBlocker
  reason: string
  nextAction: string | null
  lastCampaign: string | null
  daysSinceLastCampaign: number
  // Money keys, present only with includeMoney.
  balanceKes?: number | null
  spendChange?: number | null
}

export type AdvertiserDashboardDto = {
  kpis: {
    /** Organizations that created a campaign in the last 60 days. */
    activeOrgs: number
    newOrgs: number
    /** Organizations with a campaign running today. */
    liveOrgs: number
    // Money, present only with includeMoney.
    liveSpenders?: number
    avgSpendKes?: number | null
    top5Share?: number | null
  }
  newOrgsTrend: DailyPoint[]
  atRisk: AtRiskRow[]
  counts: {
    dormant: number
    rejectedRepeatedly: number
    // Present only with includeMoney.
    shortOfFunds?: number
    spendDown?: number
  }
  // Present only with includeMoney.
  topAdvertisers?: (NamedValue & { change: number | null })[]
  concentration?: NamedValue[]
}

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)

export function buildAdvertiserDashboard(
  orgs: AdvertiserOrgRaw[],
  options: { includeMoney: boolean; window: { start: string; end: string } }
): AdvertiserDashboardDto {
  const { includeMoney, window } = options
  const days: string[] = []
  for (let ms = Date.parse(window.start); ms <= Date.parse(window.end); ms += 86_400_000) {
    days.push(new Date(ms).toISOString().slice(0, 10))
  }
  const created = new Map<string, number>()
  for (const o of orgs) created.set(o.createdDay, (created.get(o.createdDay) ?? 0) + 1)

  const atRisk: AtRiskRow[] = []
  const counts = { dormant: 0, rejectedRepeatedly: 0, shortOfFunds: 0, spendDown: 0 }
  for (const o of orgs) {
    const health = accountHealth({
      rejectedCampaigns: o.rejectedCampaigns,
      daysSinceLastCampaign: o.daysSinceLastCampaign,
      hasFinances: includeMoney,
      funding: includeMoney ? (o.funding ?? null) : null,
      spendKes: includeMoney ? (o.spendKes ?? 0) : null,
      previousSpendKes: includeMoney ? (o.previousSpendKes ?? null) : null,
    })
    if (health.level !== "at_risk" || !health.blocker) continue
    if (health.blocker === "dormant") counts.dormant += 1
    if (health.blocker === "rejected_repeatedly") counts.rejectedRepeatedly += 1
    if (health.blocker === "short_of_funds") counts.shortOfFunds += 1
    if (health.blocker === "spend_down") counts.spendDown += 1

    const row: AtRiskRow = {
      orgId: o.orgId,
      name: o.name,
      contact: o.contact,
      blocker: health.blocker,
      reason: health.reason,
      nextAction: health.nextAction,
      lastCampaign: o.lastCampaignName,
      daysSinceLastCampaign: o.daysSinceLastCampaign,
    }
    if (includeMoney) {
      row.balanceKes = o.balanceKes ?? null
      row.spendChange = delta(o.spendKes ?? 0, o.previousSpendKes ?? null).change
    }
    atRisk.push(row)
  }
  // The most urgent blocker first, then the longest quiet.
  const urgency: Record<AccountBlocker, number> = { short_of_funds: 0, rejected_repeatedly: 1, spend_down: 2, dormant: 3 }
  atRisk.sort((a, b) => urgency[a.blocker] - urgency[b.blocker] || b.daysSinceLastCampaign - a.daysSinceLastCampaign)

  const dto: AdvertiserDashboardDto = {
    kpis: {
      activeOrgs: orgs.filter((o) => o.campaignCount > 0 && o.daysSinceLastCampaign < DORMANT_DAYS).length,
      newOrgs: orgs.filter((o) => o.createdDay >= window.start && o.createdDay <= window.end).length,
      liveOrgs: orgs.filter((o) => o.liveCampaigns > 0).length,
    },
    newOrgsTrend: days.map((day) => ({ day, orgs: created.get(day) ?? 0 })),
    atRisk,
    counts: { dormant: counts.dormant, rejectedRepeatedly: counts.rejectedRepeatedly },
  }
  if (!includeMoney) return dto

  const spenders = orgs.filter((o) => (o.spendKes ?? 0) > 0)
  const total = sum(spenders.map((o) => o.spendKes ?? 0))
  const ranked = [...spenders].sort((a, b) => (b.spendKes ?? 0) - (a.spendKes ?? 0))
  const top5 = sum(ranked.slice(0, 5).map((o) => o.spendKes ?? 0))
  dto.kpis.liveSpenders = spenders.length
  dto.kpis.avgSpendKes = spenders.length ? Math.round((total / spenders.length) * 100) / 100 : null
  dto.kpis.top5Share = total > 0 ? top5 / total : null
  dto.counts.shortOfFunds = counts.shortOfFunds
  dto.counts.spendDown = counts.spendDown
  dto.topAdvertisers = ranked.slice(0, 8).map((o) => ({
    name: o.name,
    value: o.spendKes ?? 0,
    change: delta(o.spendKes ?? 0, o.previousSpendKes ?? null).change,
  }))
  dto.concentration = foldOther(ranked.map((o) => ({ name: o.name, value: o.spendKes ?? 0 })))
  return dto
}

export type { Delta }

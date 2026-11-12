import { useRouter } from "expo-router"
import { ChartCard, KpiStrip, RankBars, ShareBar, TrendChart } from "@workspace/mobile-charts"
import { formatKes, percentOrDash, type AdvertiserDashboardDto, type AtRiskRow } from "@workspace/ops-contracts"

import { DashboardScreen, QueueList } from "@/components/dashboards/dashboard-screen"

const BLOCKER: Record<AtRiskRow["blocker"], string> = {
  short_of_funds: "Short of funds",
  rejected_repeatedly: "Rejected repeatedly",
  dormant: "Dormant",
  spend_down: "Spend down",
}
const NO_REVENUE = "Revenue appears here once advertisers are charged."

/** The Advertisers dashboard. Spend, balances and revenue share are in the response only with `finances`. */
export default function AdvertisersDashboardScreen() {
  const router = useRouter()
  return (
    <DashboardScreen<AdvertiserDashboardDto> title="Advertisers" permission="campaigns" name="advertisers" load={(c, range) => c.dashboards.advertisers(range)}>
      {(data, palette) => {
        const { kpis, counts } = data
        const money = kpis.liveSpenders !== undefined
        return (
          <>
            <KpiStrip
              palette={palette}
              items={[
                { label: "Active accounts", value: String(kpis.activeOrgs), note: "Created a campaign in the last 60 days" },
                { label: "New accounts", value: String(kpis.newOrgs), note: "Joined in the period" },
                { label: "Running now", value: String(kpis.liveOrgs), note: "Accounts with a live campaign" },
                ...(money
                  ? [
                      { label: "Spending accounts", value: String(kpis.liveSpenders), note: "Charged in the period" },
                      { label: "Avg spend per account", value: kpis.avgSpendKes == null ? "—" : formatKes(kpis.avgSpendKes), note: "Across spending accounts" },
                      { label: "Top-5 share", value: percentOrDash(kpis.top5Share), note: "Of revenue, from the five biggest" },
                    ]
                  : []),
              ]}
            />
            <ChartCard
              title="New accounts"
              description="Accounts created per day"
              isEmpty={data.newOrgsTrend.every((p) => p.orgs === 0)}
              emptyMessage="No accounts joined in this period."
              palette={palette}
            >
              <TrendChart points={data.newOrgsTrend} series={[{ key: "orgs", label: "New accounts" }]} palette={palette} />
            </ChartCard>
            {money ? (
              <>
                <ChartCard title="Top advertisers" description="Revenue in the period" isEmpty={!data.topAdvertisers?.length} emptyMessage={NO_REVENUE} palette={palette}>
                  <RankBars data={data.topAdvertisers ?? []} format={formatKes} palette={palette} />
                </ChartCard>
                <ChartCard title="Revenue concentration" description="Share of revenue by account" isEmpty={!data.concentration?.length} emptyMessage={NO_REVENUE} palette={palette}>
                  <ShareBar data={data.concentration ?? []} palette={palette} />
                </ChartCard>
              </>
            ) : null}
            <KpiStrip
              palette={palette}
              items={[
                ...(money ? [{ label: "Short of funds", value: String(counts.shortOfFunds ?? 0), note: "Budgets exceed balance" }] : []),
                { label: "Dormant 60d+", value: String(counts.dormant), note: "No campaign in 60 days" },
                { label: "Rejected repeatedly", value: String(counts.rejectedRepeatedly), note: "Sent back more than once" },
                ...(money ? [{ label: "Spend down", value: String(counts.spendDown ?? 0), note: "Down over 50% on the period before" }] : []),
              ]}
            />
            <ChartCard
              title="Accounts at risk"
              description="Accounts with a blocker, and what to do next. Every reason comes from a rule, not a score"
              isEmpty={data.atRisk.length === 0}
              emptyMessage="No accounts have a blocker."
              palette={palette}
            >
              <QueueList
                palette={palette}
                items={data.atRisk.map((r) => ({
                  key: String(r.orgId),
                  title: r.name,
                  meta: [r.contact, r.lastCampaign ? `Last campaign: ${r.lastCampaign} (${r.daysSinceLastCampaign}d ago)` : "No campaigns yet"].filter(Boolean).join(" · "),
                  detail: r.nextAction ? `${r.reason}. Next: ${r.nextAction}` : r.reason,
                  tag: { label: BLOCKER[r.blocker], tone: "serious" as const },
                  trailing: r.balanceKes == null ? undefined : formatKes(r.balanceKes),
                  onPress: () => router.push(`/(ops)/advertiser-orgs/${r.orgId}`),
                }))}
              />
            </ChartCard>
          </>
        )
      }}
    </DashboardScreen>
  )
}

"use client"

import Link from "next/link"
import { formatCompact, formatKes, type AdvertiserDashboardDto, type AtRiskRow } from "@workspace/ops-contracts"

import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { ShareBar } from "@workspace/ui/components/charts/share-bar"
import { TrendChart } from "@workspace/ui/components/charts/trend-chart"
import { DeltaPill } from "@workspace/ui/components/dashboard/delta-pill"
import { KpiStrip, type KpiItem } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { percentOrDash } from "@/components/dashboards/format"

const BLOCKER: Record<AtRiskRow["blocker"], string> = {
  short_of_funds: "Short of funds",
  rejected_repeatedly: "Rejected repeatedly",
  dormant: "Dormant",
  spend_down: "Spend down",
}

export function AdvertisersDashboard({ data }: { data: AdvertiserDashboardDto }) {
  const money = data.kpis.liveSpenders !== undefined
  const { kpis, counts } = data

  const items: KpiItem[] = [
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
  ]

  const columns: LedgerColumn<AtRiskRow>[] = [
    {
      key: "org",
      header: "Account",
      className: "min-w-44",
      render: (r) => (
        <div>
          <Link href={`/advertiser-orgs/${r.orgId}`} className="font-medium hover:underline">
            {r.name}
          </Link>
          {r.contact ? <p className="text-xs text-muted-foreground">{r.contact}</p> : null}
        </div>
      ),
    },
    {
      key: "blocker",
      header: "Blocker",
      className: "min-w-44 whitespace-normal",
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill tone="serious">{BLOCKER[r.blocker]}</StatusPill>
          <span className="text-xs text-muted-foreground">{r.reason}</span>
        </div>
      ),
    },
    { key: "last", header: "Last campaign", render: (r) => (r.lastCampaign ? `${r.lastCampaign} (${r.daysSinceLastCampaign}d ago)` : "None") },
    ...(money
      ? [
          {
            key: "balance",
            header: "Balance",
            align: "right" as const,
            render: (r: AtRiskRow) => (r.balanceKes == null ? "—" : formatKes(r.balanceKes)),
          },
          {
            key: "spend",
            header: "Spend change",
            render: (r: AtRiskRow) =>
              r.spendChange == null ? "—" : <DeltaPill delta={{ current: 0, previous: null, change: r.spendChange }} good="up" />,
          },
        ]
      : []),
    { key: "next", header: "Next action", className: "min-w-40 whitespace-normal", render: (r) => r.nextAction ?? "None" },
  ]

  return (
    <div className="grid gap-4">
      <KpiStrip items={items} columns={Math.min(5, items.length) as 3 | 4 | 5} />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className={money ? "lg:col-span-1" : "lg:col-span-3"}
          title="New accounts"
          description="Accounts created per day"
          isEmpty={data.newOrgsTrend.every((p) => p.orgs === 0)}
          emptyMessage="No accounts joined in this period."
          table={{ columns: ["Day", "New accounts"], rows: data.newOrgsTrend.map((p) => [p.day, Number(p.orgs)]) }}
        >
          <TrendChart data={data.newOrgsTrend} series={[{ key: "orgs", label: "New accounts" }]} />
        </ChartCard>
        {money ? (
          <>
            <ChartCard
              title="Top advertisers"
              description="Revenue in the period, change on the one before"
              isEmpty={!data.topAdvertisers?.length}
              emptyMessage="Revenue appears here once advertisers are charged."
              table={{ columns: ["Account", "KES"], rows: (data.topAdvertisers ?? []).map((a) => [a.name, a.value]) }}
            >
              <RankBars data={data.topAdvertisers ?? []} valueFormatter={formatKes} />
            </ChartCard>
            <ChartCard
              title="Revenue concentration"
              description="Share of revenue by account"
              isEmpty={!data.concentration?.length}
              emptyMessage="Revenue appears here once advertisers are charged."
              table={{ columns: ["Account", "KES"], rows: (data.concentration ?? []).map((a) => [a.name, a.value]) }}
            >
              <ShareBar data={data.concentration ?? []} valueFormatter={(v) => formatCompact(v)} />
            </ChartCard>
          </>
        ) : null}
      </div>

      <LedgerCard
        title="Accounts at risk"
        description="Accounts with a blocker, and what to do next. Every reason comes from a rule, not a score"
        summary={[
          ...(money ? [{ label: "Short of funds", value: counts.shortOfFunds ?? 0, note: "Budgets exceed balance" }] : []),
          { label: "Dormant 60d+", value: counts.dormant, note: "No campaign in 60 days" },
          { label: "Rejected repeatedly", value: counts.rejectedRepeatedly, note: "Sent back more than once" },
          ...(money ? [{ label: "Spend down", value: counts.spendDown ?? 0, note: "Down over 50% on the period before" }] : []),
        ]}
        columns={columns}
        rows={data.atRisk}
        rowKey={(r) => String(r.orgId)}
        footer={{ viewing: `Viewing ${data.atRisk.length} out of ${data.atRisk.length}`, page: 1, pageCount: 1, onPageChange: () => {} }}
        empty="No accounts have a blocker."
      />
    </div>
  )
}

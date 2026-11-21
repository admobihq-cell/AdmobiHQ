"use client"

import Link from "next/link"
import { formatKes, type ReportSpendDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { SyncedPanels } from "@workspace/ui/components/charts/synced-panels"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { DonutChart } from "@workspace/ui/components/charts/donut-chart"
import { RankBars } from "@workspace/ui/components/charts/rank-bars"
import { ShareBar } from "@workspace/ui/components/charts/share-bar"
import { AlertStrip } from "@workspace/ui/components/dashboard/notes"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { NO_DELIVERY_MESSAGE, percentOrDash } from "@/components/reports/format"
import { average, leader, low, pct, shortDay } from "@/components/reports/takeaways"

type Burn = ReportSpendDto["burn"][number]

const NO_SPEND_MESSAGE = "Spend appears here once your campaigns are charged."

/** How budget use compares with how much of the flight has passed. */
function pace(row: Burn): { tone: "good" | "warning" | "neutral"; label: string } {
  if (row.budgetUsed === null || row.flightElapsed === null) return { tone: "neutral", label: "No budget" }
  const gap = row.budgetUsed - row.flightElapsed
  if (gap > 0.1) return { tone: "warning", label: "Spending ahead" }
  if (gap < -0.1) return { tone: "warning", label: "Spending behind" }
  return { tone: "good", label: "On pace" }
}

const BURN_COLUMNS: LedgerColumn<Burn>[] = [
  { key: "name", header: "Campaign", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "used", header: "Budget used", align: "right", render: (r) => percentOrDash(r.budgetUsed) },
  { key: "elapsed", header: "Flight elapsed", align: "right", render: (r) => percentOrDash(r.flightElapsed) },
  { key: "pace", header: "Pace", render: (r) => <StatusPill tone={pace(r).tone}>{pace(r).label}</StatusPill> },
]

/** Reports > Spend. The page shows the access message instead of this when `billing:read` is missing. */
export function SpendTab({ report }: { report: ReportSpendDto }) {
  const filtered = report.spentKes === null
  const trend = report.costPerThousandTrend
  const hasTrend = trend.some((p) => typeof p.cost === "number")

  return (
    <div className="grid gap-4">
      {filtered ? (
        <AlertStrip
          title="Spend isn't split by market, time of day or format"
          body="Charges are held per campaign. Clear those filters to see spend and cost per 1,000."
        />
      ) : null}

      <KpiStrip
        columns={4}
        items={[
          {
            label: "Spend",
            value: report.spentKes ? formatKes(report.spentKes.current) : "—",
            note: "Charged in the selected period",
            delta: report.spentKes ? { delta: report.spentKes, good: "neutral" } : undefined,
          },
          {
            label: "Cost per 1,000",
            value: report.costPerThousandKes === null ? "—" : formatKes(report.costPerThousandKes),
            note: "Per 1,000 est. impressions, tax left out",
          },
          {
            label: "Budget used",
            value: percentOrDash(report.budgetUsed),
            note: report.budgetKes === null ? undefined : `Of ${formatKes(report.budgetKes)} booked`,
          },
          {
            label: "Unspent",
            value: report.unspentKes === null ? "—" : formatKes(report.unspentKes),
            note: "On live and scheduled campaigns",
          },
        ]}
      />

      <ChartCard
        title="Spend and cost per 1,000"
        description="What you spent each day (tax left out), and what that bought per 1,000 est. impressions"
        takeaway={(() => {
          const avg = average(trend, "cost")
          const cheapest = low(trend, "cost")
          return avg === undefined || !cheapest
            ? undefined
            : `On average you paid ${formatKes(Math.round(avg))} to be seen 1,000 times. Cheapest day: ${shortDay(cheapest.day)} (${formatKes(Math.round(cheapest.value))}).`
        })()}
        isEmpty={!hasTrend}
        emptyMessage={report.hasDeliveryRows ? "Cost per 1,000 needs spend and an audience estimate." : NO_DELIVERY_MESSAGE}
        table={{
          columns: ["Day", "Spend (KES)", "KES per 1,000"],
          rows: trend.map((p) => [
            p.day,
            typeof p.spend === "number" ? Math.round(p.spend) : null,
            typeof p.cost === "number" ? Math.round(p.cost) : null,
          ]),
        }}
      >
        <SyncedPanels
          data={trend}
          top={{ kind: "column", label: "Spend", series: [{ key: "spend", label: "Spend" }], valueFormatter: formatKes }}
          bottom={{ kind: "trend", label: "Cost per 1,000", series: [{ key: "cost", label: "Cost per 1,000" }], valueFormatter: formatKes }}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="By campaign"
          description="Share of spend"
          takeaway={(() => {
            const top = leader(report.byCampaign ?? [])
            return top ? `${top.name} took ${pct(top.share)} of your spend.` : undefined
          })()}
          isEmpty={!report.byCampaign?.length}
          emptyMessage={filtered ? "Clear the filters to see spend." : NO_SPEND_MESSAGE}
          table={{ columns: ["Campaign", "KES"], rows: (report.byCampaign ?? []).map((r) => [r.name, r.value]) }}
        >
          <DonutChart data={report.byCampaign ?? []} valueFormatter={formatKes} />
        </ChartCard>
        <ChartCard
          title="By objective"
          description="Share of spend"
          takeaway={(() => {
            const top = leader(report.byObjective ?? [])
            return top ? `${pct(top.share)} of your spend went to ${top.name.toLowerCase()}.` : undefined
          })()}
          isEmpty={!report.byObjective?.length}
          emptyMessage={filtered ? "Clear the filters to see spend." : NO_SPEND_MESSAGE}
          table={{ columns: ["Objective", "KES"], rows: (report.byObjective ?? []).map((r) => [r.name, r.value]) }}
        >
          <ShareBar data={report.byObjective ?? []} valueFormatter={formatKes} />
        </ChartCard>
        <ChartCard
          title="By format"
          description="Spend by ad format"
          takeaway={(() => {
            const top = leader(report.byFormat ?? [])
            return top ? `Most of your spend went on ${top.name} (${pct(top.share)}).` : undefined
          })()}
          isEmpty={!report.byFormat?.length}
          emptyMessage={filtered ? "Clear the filters to see spend." : NO_SPEND_MESSAGE}
          table={{ columns: ["Format", "KES"], rows: (report.byFormat ?? []).map((r) => [r.name, r.value]) }}
        >
          <RankBars data={report.byFormat ?? []} valueFormatter={formatKes} />
        </ChartCard>
      </div>

      <LedgerCard
        title="Budget burn"
        description="Budget used against how much of the flight has passed. Ahead or behind by more than 10 points is flagged"
        columns={BURN_COLUMNS}
        rows={report.burn}
        rowKey={(r) => String(r.campaignId)}
        toolbar={
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing">Open Finance &amp; Billing</Link>
          </Button>
        }
        empty="Campaigns with a budget appear here."
      />
    </div>
  )
}

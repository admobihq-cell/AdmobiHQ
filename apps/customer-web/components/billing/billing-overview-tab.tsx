"use client"

import Link from "next/link"
import { Download, FileText, Headset, Landmark, Lock, PiggyBank, Receipt, Wallet } from "lucide-react"
import { exportFileName, formatKes, type FinanceSummaryDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { ChartCard } from "@workspace/ui/components/charts/chart-card"
import { DonutChart } from "@workspace/ui/components/charts/donut-chart"
import { MirrorBars } from "@workspace/ui/components/charts/mirror-bars"
import { ShareBar } from "@workspace/ui/components/charts/share-bar"
import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { AlertStrip } from "@workspace/ui/components/dashboard/notes"
import { FundingCard } from "@/components/billing/funding-card"
import { transactionsPath, type RangeParams } from "@/lib/analytics-client"
import { useDownloadPdf } from "@/lib/use-campaigns"

export const NO_LEDGER_MESSAGE = "Your transactions appear here after your first top-up."

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-11" → "Nov 26". */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-")
  return `${MONTHS[Number(m) - 1] ?? month} ${String(year).slice(2)}`
}

export function BillingOverviewTab({
  summary,
  range,
  onTopUp,
  onNavigate,
}: {
  summary: FinanceSummaryDto
  range: RangeParams
  onTopUp: () => void
  onNavigate: (tab: string) => void
}) {
  const download = useDownloadPdf()
  const { hasLedgerRows } = summary
  const spendEmpty = hasLedgerRows ? "No spending in this period." : NO_LEDGER_MESSAGE
  const spendTotal = summary.spendByCategory.reduce((sum, row) => sum + row.value, 0)
  const campaignTotal = summary.spendByCampaign.reduce((sum, row) => sum + row.value, 0)
  const flow = summary.moneyInOut.map((row) => ({ period: monthLabel(row.period), in: row.inKes, out: row.outKes }))

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <KpiStrip
          columns={2}
          className="self-start"
          items={[
            {
              label: "Balance",
              value: formatKes(summary.balanceKes),
              note: "All time, whatever range is selected",
              icon: <Wallet />,
            },
            {
              label: "Available",
              value: summary.availableKes === null ? "—" : formatKes(summary.availableKes),
              note: summary.availableKes === null ? "Appears after your first top-up" : "Balance minus committed",
              icon: <Landmark />,
            },
            {
              label: "Spent",
              value: formatKes(summary.spentKes.current),
              note: "In the selected period",
              delta: { delta: summary.spentKes, good: "neutral" },
              icon: <Receipt />,
            },
            {
              label: "Committed",
              value: formatKes(summary.committedKes),
              note: "Left on live and scheduled budgets",
              icon: <Lock />,
            },
          ]}
        />
        <div className="grid content-start gap-3">
          <ChartCard
            title="Where your money went"
            description="Share of spend in the selected period"
            isEmpty={spendTotal <= 0}
            emptyMessage={spendEmpty}
            table={{
              columns: ["Category", "KES"],
              rows: summary.spendByCategory.map((row) => [row.name, row.value]),
            }}
          >
            <ShareBar data={summary.spendByCategory} valueFormatter={formatKes} />
          </ChartCard>
          {summary.funding.level === "short" ? (
            <AlertStrip
              title="Your funds are short"
              body={`Your active budgets are ${formatKes(-(summary.availableKes ?? 0))} more than your balance.`}
              action={
                <Button size="sm" onClick={onTopUp}>
                  Top up
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Money in vs out"
          description="Top-ups against spend, by month"
          isEmpty={flow.length === 0}
          emptyMessage={spendEmpty}
          table={{ columns: ["Month", "Money in (KES)", "Money out (KES)"], rows: flow.map((r) => [r.period, r.in, r.out]) }}
        >
          <MirrorBars
            data={flow}
            up={{ key: "in", label: "Top-ups" }}
            down={{ key: "out", label: "Spend" }}
            valueFormatter={formatKes}
          />
        </ChartCard>
        <ChartCard
          title="Spend by campaign"
          description="Share of spend in the selected period"
          isEmpty={campaignTotal <= 0}
          emptyMessage={spendEmpty}
          table={{ columns: ["Campaign", "KES"], rows: summary.spendByCampaign.map((r) => [r.name, r.value]) }}
        >
          <DonutChart
            data={summary.spendByCampaign}
            centerLabel={{ label: "Spent", value: formatKes(campaignTotal) }}
            valueFormatter={formatKes}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FundingCard summary={summary} />

        <DashboardCard
          title="Upcoming charges"
          description="Planned spend on scheduled campaigns, not a bill"
          footer={
            summary.upcomingCharges.length > 0 ? (
              <div className="flex w-full items-center justify-between text-sm">
                <span className="text-muted-foreground">Total planned</span>
                <span className="font-medium tabular-nums">
                  {formatKes(summary.upcomingCharges.reduce((sum, c) => sum + c.remainingKes, 0))}
                </span>
              </div>
            ) : undefined
          }
        >
          {summary.upcomingCharges.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              No scheduled campaigns have budget waiting to start.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {summary.upcomingCharges.slice(0, 5).map((charge) => (
                <li key={charge.campaignId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/campaigns/${charge.campaignId}`} className="block truncate text-sm font-medium hover:underline">
                      {charge.campaignName}
                    </Link>
                    <p className="text-xs text-muted-foreground">Starts {charge.startsOn}</p>
                  </div>
                  <span className="text-sm tabular-nums">{formatKes(charge.remainingKes)}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Shortcuts" description="Common money tasks">
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start" onClick={onTopUp}>
              <PiggyBank data-icon="inline-start" />
              Top up
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              loading={download.isPending}
              loadingText="Preparing…"
              onClick={() =>
                download.mutate({
                  path: "/v1/customer/campaigns/statement",
                  filename: exportFileName("campaign budget statement", null, "pdf"),
                })
              }
            >
              <FileText data-icon="inline-start" />
              Budget statement
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate("invoices")}>
              <Receipt data-icon="inline-start" />
              Invoices
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              disabled={!hasLedgerRows}
              loading={download.isPending}
              onClick={() =>
                download.mutate({
                  path: transactionsPath({ range, sort: "date_desc" }, true),
                  filename: exportFileName("transactions", null, "csv"),
                })
              }
            >
              <Download data-icon="inline-start" />
              Export transactions
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/settings/support">
                <Headset data-icon="inline-start" />
                Contact support
              </Link>
            </Button>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}

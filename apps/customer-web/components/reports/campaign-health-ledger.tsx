"use client"

import Link from "next/link"
import { formatKes, type ReportCampaignRowDto, type ReportOverviewDto } from "@workspace/ops-contracts"

import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { TickBar } from "@workspace/ui/components/charts/tick-bar"
import { HEALTH_LABEL, HEALTH_TONE, compactOrDash, rangeText, rateTone } from "@/components/reports/format"

export const campaignColumns = (showMoney: boolean): LedgerColumn<ReportCampaignRowDto>[] => [
  {
    key: "name",
    header: "Campaign",
    className: "min-w-44",
    render: (r) => (
      <div>
        <Link href={`/reports/campaigns/${r.id}`} className="font-medium hover:underline">
          {r.name}
        </Link>
        <p className="text-xs text-muted-foreground">{r.market ?? "No market"}</p>
      </div>
    ),
  },
  {
    key: "health",
    header: "Status",
    className: "min-w-40 whitespace-normal",
    render: (r) => (
      <div className="flex flex-col items-start gap-1">
        <StatusPill tone={HEALTH_TONE[r.health.level]}>{HEALTH_LABEL[r.health.level]}</StatusPill>
        <span className="text-xs text-muted-foreground">{r.health.reason}</span>
      </div>
    ),
  },
  {
    key: "flight",
    header: "Flight",
    render: (r) => (r.startsOn && r.endsOn ? `${r.startsOn} to ${r.endsOn}` : "Not scheduled"),
  },
  { key: "delivery", header: "Delivery", render: (r) => <TickBar percent={r.deliveryRate === null ? null : r.deliveryRate * 100} tone={rateTone(r.deliveryRate)} /> },
  {
    key: "impressions",
    header: "Est. impressions",
    align: "right",
    render: (r) => (
      <div>
        <p>{compactOrDash(r.impressions.likely)}</p>
        {rangeText(r.impressions.low, r.impressions.high) ? (
          <p className="text-xs text-muted-foreground">{rangeText(r.impressions.low, r.impressions.high)}</p>
        ) : null}
      </div>
    ),
  },
  ...(showMoney
    ? [{ key: "spent", header: "Spent", align: "right" as const, render: (r: ReportCampaignRowDto) => (r.spentKes === null ? "—" : formatKes(r.spentKes)) }]
    : []),
  { key: "next", header: "Next action", className: "min-w-36 whitespace-normal", render: (r) => r.health.nextAction ?? "None" },
]

/** Every campaign with its health, a reason, and what to do next. */
export function CampaignHealthLedger({
  ledger,
  showMoney,
}: {
  ledger: ReportOverviewDto["ledger"]
  showMoney: boolean
}) {
  return (
    <LedgerCard
      title="Campaign health"
      description="Delivery and next steps for each campaign. Health uses each campaign's whole flight so far"
      summary={[
        { label: "At risk", value: ledger.atRisk, note: "Need action" },
        { label: "Watch", value: ledger.watch, note: "Worth monitoring" },
        { label: "Ending soon", value: ledger.endingSoon, note: "Within 7 days" },
        ...(ledger.unspentBudgetKes !== null
          ? [{ label: "Unspent budget", value: formatKes(ledger.unspentBudgetKes), note: "On live and scheduled campaigns" }]
          : []),
      ]}
      columns={campaignColumns(showMoney)}
      rows={ledger.rows}
      rowKey={(r) => String(r.id)}
      footer={{
        viewing: `Viewing ${ledger.rows.length} out of ${ledger.rows.length}`,
        page: 1,
        pageCount: 1,
        onPageChange: () => {},
      }}
      empty="Campaigns appear here once you create one."
    />
  )
}

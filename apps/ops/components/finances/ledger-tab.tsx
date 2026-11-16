"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Download } from "lucide-react"
import { exportFileName, formatKes, toCsv } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { RecordTransactionDialog } from "@/components/finances/record-transaction-dialog"
import { DELETED_ORG } from "@/lib/queries/finance-constants"
import type { FinanceLedgerDto, LedgerRowDto, RecordOptionsDto } from "@/lib/queries/finance"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "top_up", label: "Top-ups" },
  { value: "spend", label: "Spend" },
  { value: "refund", label: "Refunds" },
  { value: "adjustment", label: "Adjustments" },
]

const KIND_LABEL: Record<string, string> = { top_up: "Top-up", spend: "Spend", refund: "Refund", adjustment: "Adjustment" }

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })

const COLUMNS: LedgerColumn<LedgerRowDto>[] = [
  { key: "date", header: "Date", render: (r) => date(r.occurredAt) },
  {
    key: "org",
    header: "Account",
    className: "min-w-40",
    render: (r) =>
      r.orgId && r.orgName !== DELETED_ORG ? (
        <Link href={`/advertiser-orgs/${r.orgId}`} className="font-medium hover:underline">
          {r.orgName}
        </Link>
      ) : (
        <span className="text-muted-foreground">{r.orgName}</span>
      ),
  },
  { key: "campaign", header: "Campaign", render: (r) => r.campaignName },
  { key: "kind", header: "Type", render: (r) => KIND_LABEL[r.kind] ?? r.kind },
  {
    key: "description",
    header: "Description",
    className: "min-w-48 whitespace-normal",
    render: (r) => (
      <div>
        <p>{r.description}</p>
        <p className="text-xs text-muted-foreground">
          {[r.category, r.reference, r.provider].filter(Boolean).join(" · ")}
        </p>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    render: (r) => `${r.amountKes > 0 ? "+" : ""}${formatKes(r.amountKes)}`,
  },
]

/** The ledger for the period, with CSV and a way to add a row. Shows the latest rows; totals cover them all. */
export function LedgerTab({ data, options }: { data: FinanceLedgerDto; options: RecordOptionsDto }) {
  const [filter, setFilter] = useState("all")
  const rows = useMemo(() => data.rows.filter((r) => filter === "all" || r.kind === filter), [data.rows, filter])

  function download() {
    const csv = toCsv(
      rows.map((r) => ({
        date: r.occurredAt.slice(0, 10),
        account: r.orgName,
        campaign: r.campaignName,
        type: r.kind,
        category: r.category ?? "",
        description: r.description,
        reference: r.reference ?? "",
        provider: r.provider,
        amount_kes: r.amountKes,
      })),
      ["date", "account", "campaign", "type", "category", "description", "reference", "provider", "amount_kes"]
    )
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = exportFileName("ledger", null, "csv")
    a.click()
    URL.revokeObjectURL(url)
  }

  const { totals } = data
  return (
    <LedgerCard
      title="Ledger"
      description="Every wallet transaction in the period, newest first"
      summary={[
        { label: "Top-ups", value: formatKes(totals.topUpsKes), note: "Money in" },
        { label: "Spend", value: formatKes(totals.spendKes), note: "Charged to campaigns" },
        { label: "Refunds", value: formatKes(totals.refundsKes), note: "Returned to wallets" },
        { label: "Net", value: formatKes(totals.netKes), note: "Change in funds held" },
      ]}
      filterTabs={{
        tabs: FILTERS.map((f) => ({ ...f, count: f.value === "all" ? data.rows.length : data.rows.filter((r) => r.kind === f.value).length })),
        value: filter,
        onChange: setFilter,
      }}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={download} disabled={rows.length === 0}>
            <Download aria-hidden />
            CSV
          </Button>
          <RecordTransactionDialog options={options} />
        </div>
      }
      columns={COLUMNS}
      rows={rows}
      rowKey={(r) => String(r.id)}
      footer={{
        viewing: `Viewing ${rows.length} of the latest ${data.rows.length}, out of ${totals.count} in the period`,
        page: 1,
        pageCount: 1,
        onPageChange: () => {},
      }}
      empty={data.rows.length === 0 ? "Transactions appear here once an advertiser's wallet has activity." : "Nothing matches this filter."}
    />
  )
}

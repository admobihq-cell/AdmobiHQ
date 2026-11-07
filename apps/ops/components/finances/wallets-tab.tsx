"use client"

import { useState } from "react"
import Link from "next/link"
import { formatKes } from "@workspace/ops-contracts"

import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import type { WalletRowDto, WalletStatus } from "@/lib/queries/finance"

const STATUS: Record<WalletStatus, { label: string; tone: "serious" | "good" | "neutral" }> = {
  short: { label: "Short of funds", tone: "serious" },
  healthy: { label: "Healthy", tone: "good" },
  inactive: { label: "Inactive", tone: "neutral" },
}

const FILTERS: { value: "all" | WalletStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "short", label: "Short of funds" },
  { value: "healthy", label: "Healthy" },
  { value: "inactive", label: "Inactive" },
]

const COLUMNS: LedgerColumn<WalletRowDto>[] = [
  {
    key: "org",
    header: "Account",
    className: "min-w-44",
    render: (w) => (
      <Link href={`/advertiser-orgs/${w.orgId}`} className="font-medium hover:underline">
        {w.orgName}
      </Link>
    ),
  },
  { key: "balance", header: "Balance", align: "right", render: (w) => formatKes(w.balanceKes) },
  { key: "committed", header: "Committed", align: "right", render: (w) => formatKes(w.committedKes) },
  {
    key: "available",
    header: "Available",
    align: "right",
    render: (w) => <span className={w.availableKes < 0 ? "font-medium text-destructive" : undefined}>{formatKes(w.availableKes)}</span>,
  },
  { key: "runway", header: "Runway", align: "right", render: (w) => (w.runwayDays === null ? "—" : `${w.runwayDays} days`) },
  { key: "last", header: "Last top-up", render: (w) => w.lastTopUpOn ?? "None" },
  { key: "status", header: "Status", render: (w) => <StatusPill tone={STATUS[w.status].tone}>{STATUS[w.status].label}</StatusPill> },
]

/** One row per advertiser with a wallet, grouped by whether they can cover what they have booked. */
export function WalletsTab({ wallets }: { wallets: WalletRowDto[] }) {
  const [filter, setFilter] = useState<"all" | WalletStatus>("all")
  const count = (s: WalletStatus) => wallets.filter((w) => w.status === s).length
  const rows = wallets
    .filter((w) => filter === "all" || w.status === filter)
    // Trouble first: the least available funds lead.
    .sort((a, b) => a.availableKes - b.availableKes)

  return (
    <LedgerCard
      title="Wallets"
      description="Funds held for each advertiser, and whether they cover live and scheduled budgets"
      summary={[
        { label: "Wallets", value: wallets.length, note: "Accounts with ledger activity" },
        { label: "Funds held", value: formatKes(wallets.reduce((sum, w) => sum + w.balanceKes, 0)), note: "Owed to advertisers" },
        { label: "Short of funds", value: count("short"), note: "Budgets exceed balance" },
        { label: "Inactive", value: count("inactive"), note: "No activity in 60 days" },
      ]}
      filterTabs={{
        tabs: FILTERS.map((f) => ({ ...f, count: f.value === "all" ? wallets.length : count(f.value) })),
        value: filter,
        onChange: (v) => setFilter(v as typeof filter),
      }}
      columns={COLUMNS}
      rows={rows}
      rowKey={(w) => String(w.orgId)}
      footer={{ viewing: `Viewing ${rows.length} out of ${wallets.length}`, page: 1, pageCount: 1, onPageChange: () => {} }}
      empty={wallets.length === 0 ? "Wallets appear here once an advertiser has ledger activity." : "Nothing matches this filter."}
    />
  )
}

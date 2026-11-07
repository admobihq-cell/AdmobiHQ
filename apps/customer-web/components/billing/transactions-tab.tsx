"use client"

import { useEffect, useState } from "react"
import { Download, Search } from "lucide-react"
import {
  SPEND_CATEGORY_LABELS,
  exportFileName,
  formatKes,
  type TransactionDto,
  type WalletTransactionKind,
} from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { NO_LEDGER_MESSAGE } from "@/components/billing/billing-overview-tab"
import { KIND_LABELS, formatDate, signedKes } from "@/components/billing/format"
import { TransactionSheet } from "@/components/billing/transaction-sheet"
import { transactionsPath, type RangeParams } from "@/lib/analytics-client"
import { useTransactions } from "@/lib/use-analytics"
import { useDownloadPdf } from "@/lib/use-campaigns"

const KIND_TABS = [
  { value: "all", label: "All" },
  { value: "top_up", label: "Top-ups" },
  { value: "spend", label: "Spend" },
  { value: "refund", label: "Refunds" },
  { value: "adjustment", label: "Adjustments" },
]

const SORTS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Largest amount" },
  { value: "amount_asc", label: "Smallest amount" },
]

const COLUMNS: LedgerColumn<TransactionDto>[] = [
  { key: "date", header: "Date", render: (t) => formatDate(t.occurredAt) },
  {
    key: "description",
    header: "Description",
    className: "min-w-48 whitespace-normal",
    render: (t) => (
      <div>
        <p className="font-medium">{t.description}</p>
        <p className="text-xs text-muted-foreground">{t.reference ?? KIND_LABELS[t.kind]}</p>
      </div>
    ),
  },
  { key: "campaign", header: "Campaign", render: (t) => t.campaignName ?? "None" },
  {
    key: "category",
    header: "Category",
    render: (t) => (t.spendCategory ? SPEND_CATEGORY_LABELS[t.spendCategory] : "None"),
  },
  { key: "amount", header: "Amount", align: "right", render: (t) => signedKes(t.amountKes, formatKes) },
  { key: "balance", header: "Balance after", align: "right", render: (t) => formatKes(t.balanceAfterKes) },
]

export function TransactionsTab({ range }: { range: RangeParams }) {
  const [kind, setKind] = useState("all")
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [sort, setSort] = useState("date_desc")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<TransactionDto | null>(null)
  const download = useDownloadPdf()

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const params = {
    range,
    kind: kind === "all" ? undefined : (kind as WalletTransactionKind),
    q: q || undefined,
    sort,
    page,
  }
  const query = useTransactions(params)
  const data = query.data
  const filtered = kind !== "all" || q !== ""

  function reset(update: () => void) {
    update()
    setPage(1)
  }

  if (query.isError) {
    return (
      <ApiErrorBanner
        message={query.error instanceof Error ? query.error.message : "Could not load transactions."}
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <>
      <LedgerCard
        title="Transactions"
        description="Every top-up, charge and refund on your wallet, in the selected period"
        summary={
          data
            ? [
                { label: "Top-ups", value: formatKes(data.summary.topUpsKes), note: "Money added" },
                { label: "Spend", value: formatKes(data.summary.spendKes), note: "Charged to campaigns" },
                { label: "Refunds", value: formatKes(data.summary.refundsKes), note: "Returned to your wallet" },
                { label: "Net", value: signedKes(data.summary.netKes, formatKes), note: "Change in balance" },
              ]
            : undefined
        }
        filterTabs={{
          tabs: KIND_TABS,
          value: kind,
          onChange: (value) => reset(() => setKind(value)),
        }}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => reset(() => setSearch(e.target.value))}
                placeholder="Search description or reference"
                aria-label="Search transactions"
                className="h-8 w-56 pl-8"
              />
            </div>
            <Select value={sort} onValueChange={(value) => reset(() => setSort(value))}>
              <SelectTrigger size="sm" aria-label="Sort transactions" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              loading={download.isPending}
              disabled={!data || data.total === 0}
              onClick={() =>
                download.mutate({
                  path: transactionsPath({ ...params, page: undefined }, true),
                  filename: exportFileName("transactions", null, "csv"),
                })
              }
            >
              <Download aria-hidden />
              CSV
            </Button>
          </div>
        }
        columns={COLUMNS}
        rows={data?.items ?? []}
        rowKey={(t) => String(t.id)}
        onRowClick={setSelected}
        footer={
          data
            ? {
                viewing: `Viewing ${data.items.length} out of ${data.total}`,
                page: data.page,
                pageCount: data.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
        empty={query.isPending ? "Loading transactions." : filtered ? "Nothing matches these filters." : NO_LEDGER_MESSAGE}
      />
      <TransactionSheet transaction={selected} onClose={() => setSelected(null)} />
    </>
  )
}

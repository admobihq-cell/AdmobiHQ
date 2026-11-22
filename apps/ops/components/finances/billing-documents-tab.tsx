"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Plus, Search } from "lucide-react"
import { formatKes, type BillingDocumentListItemDto } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { BillingDocumentsSkeleton } from "@/components/dashboards/dashboard-skeletons"
import { billingPillProps, formatDay } from "@/components/finances/billing-status"
import { matchesSearch } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

type Filter = "all" | "invoices" | "quotes" | "unpaid" | "drafts"

const FILTER_TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "invoices", label: "Invoices" },
  { value: "quotes", label: "Quotes" },
  { value: "unpaid", label: "Unpaid" },
  { value: "drafts", label: "Drafts" },
]

const isOpen = (d: BillingDocumentListItemDto) =>
  d.paymentState === "unpaid" || d.paymentState === "overdue" || d.paymentState === "part_paid"
const balance = (d: BillingDocumentListItemDto) => Math.max(d.totalKes - d.paidKes, 0)

function matchesFilter(doc: BillingDocumentListItemDto, filter: Filter): boolean {
  switch (filter) {
    case "invoices":
      return doc.kind === "invoice"
    case "quotes":
      return doc.kind === "quote"
    case "unpaid":
      return isOpen(doc)
    case "drafts":
      return doc.status === "draft"
    default:
      return true
  }
}

const columns: LedgerColumn<BillingDocumentListItemDto>[] = [
  {
    key: "number",
    header: "Number",
    render: (d) => <span className="font-medium tabular-nums">{d.number}</span>,
  },
  { key: "kind", header: "Type", render: (d) => (d.kind === "quote" ? "Quote" : "Invoice") },
  {
    key: "customer",
    header: "Customer",
    render: (d) => (
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{d.customerName}</span>
        {d.campaignName ? <span className="truncate text-xs text-muted-foreground">{d.campaignName}</span> : null}
      </div>
    ),
  },
  { key: "issued", header: "Issued", render: (d) => formatDay(d.issueDate) },
  { key: "due", header: "Due", render: (d) => formatDay(d.dueDate) },
  { key: "total", header: "Total", align: "right", render: (d) => <span className="tabular-nums">{formatKes(d.totalKes)}</span> },
  {
    key: "paid",
    header: "Paid",
    align: "right",
    render: (d) => (d.kind === "invoice" ? <span className="tabular-nums">{formatKes(d.paidKes)}</span> : "—"),
  },
  {
    key: "status",
    header: "Status",
    render: (d) => {
      const pill = billingPillProps(d)
      return <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
    },
  },
]

/** Finances → Invoices & quotes: every hand-written document, with what is still owed. */
export function BillingDocumentsTab() {
  const client = useOpsClient()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")

  const query = useQuery({
    queryKey: ["billing-documents"],
    queryFn: () => client.billingDocuments.list(),
  })
  const docs = useMemo(() => query.data?.items ?? [], [query.data])

  const rows = useMemo(
    () => docs.filter((d) => matchesFilter(d, filter) && matchesSearch(search, d.number, d.customerName, d.campaignName)),
    [docs, filter, search]
  )

  if (query.isPending) {
    return <BillingDocumentsSkeleton />
  }
  if (query.isError) return <ApiErrorBanner message={formatApiError(query.error)} />

  const open = docs.filter(isOpen)
  const overdue = docs.filter((d) => d.paymentState === "overdue")
  const quotesOut = docs.filter((d) => d.kind === "quote" && d.status === "sent")

  return (
    <LedgerCard
      title="Invoices & quotes"
      description="Documents billed outside the Paystack wallet. Payments recorded here never touch an advertiser's balance."
      summary={[
        { label: "Outstanding", value: formatKes(open.reduce((s, d) => s + balance(d), 0)), note: `${open.length} open invoices` },
        { label: "Overdue", value: formatKes(overdue.reduce((s, d) => s + balance(d), 0)), note: `${overdue.length} past due` },
        { label: "Quotes awaiting reply", value: String(quotesOut.length) },
      ]}
      filterTabs={{
        tabs: FILTER_TABS.map((t) => ({ ...t, count: docs.filter((d) => matchesFilter(d, t.value)).length })),
        value: filter,
        onChange: (value) => setFilter(value as Filter),
      }}
      toolbar={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number or customer"
              aria-label="Search invoices and quotes"
              className="h-9 w-56 pl-8"
            />
          </div>
          <Button asChild size="sm">
            <Link href="/finances/documents/new">
              <Plus aria-hidden />
              New
            </Link>
          </Button>
        </div>
      }
      columns={columns}
      rows={rows}
      rowKey={(d) => String(d.id)}
      onRowClick={(d) => router.push(`/finances/documents/${d.id}`)}
      empty={
        docs.length === 0 ? (
          <span className="flex flex-col items-center gap-3">
            No invoices or quotes yet.
            <Button asChild size="sm" variant="outline">
              <Link href="/finances/documents/new">
                <Plus aria-hidden />
                Create the first one
              </Link>
            </Button>
          </span>
        ) : (
          "Nothing matches this filter."
        )
      }
    />
  )
}

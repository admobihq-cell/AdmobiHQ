"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Download, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"
import {
  formatKes,
  type AdmobiMatch,
  type DateRangeKey,
  type PaystackPageDto,
  type PaystackResource,
  type PaystackRowDto,
  type PaystackSummaryDto,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { DashboardTabs } from "@workspace/ui/components/dashboard/dashboard-tabs"
import { KpiStrip } from "@workspace/ui/components/dashboard/kpi-strip"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { StatusPill, type StatusTone } from "@workspace/ui/components/dashboard/status-pill"
import { refreshFinance } from "@/app/(dashboard)/finances/actions"
import { useOpsClient } from "@/lib/ops-client"

const PER_PAGE = 25
const DAYS: Record<DateRangeKey, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null }

const VIEWS: { value: PaystackResource; label: string }[] = [
  { value: "transactions", label: "Transactions" },
  { value: "settlements", label: "Settlements" },
  { value: "transfers", label: "Transfers" },
  { value: "refunds", label: "Refunds" },
  { value: "disputes", label: "Disputes" },
]

/** Paystack's own status values, per list. Refunds have no status filter on Paystack. */
const STATUSES: Partial<Record<PaystackResource, string[]>> = {
  transactions: ["success", "failed", "abandoned", "reversed"],
  settlements: ["success", "processing", "pending", "failed"],
  transfers: ["success", "pending", "failed", "reversed"],
  disputes: ["awaiting-merchant-feedback", "awaiting-bank-feedback", "pending", "resolved"],
}

const TONE: Record<string, StatusTone> = {
  success: "good", processed: "good", resolved: "good",
  pending: "warning", processing: "warning", ongoing: "warning", queued: "warning",
  "awaiting-merchant-feedback": "serious", "needs-attention": "serious",
  failed: "serious", abandoned: "neutral", reversed: "neutral",
}
const label = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1)).replace(/[-_]/g, " ")
const status = (s: string) => <StatusPill tone={TONE[s] ?? "neutral"}>{label(s)}</StatusPill>

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })
    : "—"

const account = (orgId: number | null, orgName: string | null) =>
  orgId ? (
    <Link href={`/advertiser-orgs/${orgId}`} className="font-medium hover:underline">
      {orgName ?? `Org ${orgId}`}
    </Link>
  ) : (
    <span className="text-muted-foreground">—</span>
  )

const MATCH: Record<AdmobiMatch, { tone: StatusTone; text: string }> = {
  credited: { tone: "good", text: "In Admobi" },
  not_credited: { tone: "serious", text: "Not credited" },
  not_ours: { tone: "neutral", text: "Not an Admobi payment" },
}

function SyncButton({ reference, onDone }: { reference: string; onDone: () => void }) {
  const client = useOpsClient()
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      loadingText="Syncing…"
      onClick={() =>
        start(async () => {
          try {
            const { result } = await client.finance.paystack.sync({ reference })
            toast[result === "settled" || result === "already_settled" ? "success" : "message"](
              result === "settled" ? "Credited to the advertiser" : `Paystack says: ${label(result ?? "unknown")}`,
            )
            await refreshFinance()
            onDone()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't sync this payment")
          }
        })
      }
    >
      Sync
    </Button>
  )
}

function columns(reload: () => void): { [R in PaystackResource]: LedgerColumn<PaystackRowDto[R]>[] } {
  return {
    transactions: [
      { key: "date", header: "Date", render: (t) => when(t.paidAt ?? t.createdAt) },
      {
        key: "payer",
        header: "Payer",
        className: "min-w-48",
        render: (t) => (
          <div>
            <p className="font-medium">{t.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{t.reference}</p>
          </div>
        ),
      },
      { key: "org", header: "Account", render: (t) => account(t.orgId, t.orgName) },
      { key: "channel", header: "Channel", render: (t) => (t.channel === "mobile_money" ? "M-Pesa" : t.channel ? label(t.channel) : "—") },
      { key: "amount", header: "Amount", align: "right", render: (t) => formatKes(t.amountKes) },
      { key: "fees", header: "Fees", align: "right", render: (t) => (t.feesKes == null ? "—" : formatKes(t.feesKes)) },
      {
        key: "status",
        header: "Status",
        className: "max-w-56 whitespace-normal",
        render: (t) => (
          <div className="flex flex-col items-start gap-1">
            {status(t.status)}
            {t.status !== "success" && t.gatewayResponse ? <span className="text-xs text-muted-foreground">{t.gatewayResponse}</span> : null}
          </div>
        ),
      },
      {
        key: "match",
        header: "In Admobi",
        render: (t) => (
          <div className="flex items-center gap-2">
            <StatusPill tone={MATCH[t.match].tone}>{MATCH[t.match].text}</StatusPill>
            {t.match === "not_credited" ? <SyncButton reference={t.reference} onDone={reload} /> : null}
          </div>
        ),
      },
    ],
    settlements: [
      { key: "date", header: "Settled", render: (s) => when(s.settledAt ?? s.createdAt) },
      { key: "status", header: "Status", render: (s) => status(s.status) },
      { key: "total", header: "Collected", align: "right", render: (s) => formatKes(s.totalKes) },
      { key: "fees", header: "Fees", align: "right", render: (s) => formatKes(s.feesKes) },
      { key: "net", header: "Paid out", align: "right", render: (s) => <span className="font-medium">{formatKes(s.netKes)}</span> },
    ],
    transfers: [
      { key: "date", header: "Date", render: (t) => when(t.createdAt) },
      { key: "to", header: "Recipient", className: "min-w-40", render: (t) => <span className="font-medium">{t.recipientName ?? "—"}</span> },
      { key: "reason", header: "Reason", className: "min-w-48 whitespace-normal", render: (t) => t.reason ?? "—" },
      { key: "amount", header: "Amount", align: "right", render: (t) => formatKes(t.amountKes) },
      { key: "status", header: "Status", render: (t) => status(t.status) },
      {
        key: "payout",
        header: "In Admobi",
        render: (t) =>
          t.payoutId ? (
            <Link href="/finances?tab=payouts" className="hover:underline">
              Payout #{t.payoutId}
            </Link>
          ) : (
            <StatusPill tone="warning">Sent outside Admobi</StatusPill>
          ),
      },
    ],
    refunds: [
      { key: "date", header: "Date", render: (r) => when(r.createdAt) },
      { key: "tx", header: "Payment", render: (r) => r.transactionReference ?? "—" },
      { key: "org", header: "Account", render: (r) => account(r.orgId, r.orgName) },
      { key: "amount", header: "Amount", align: "right", render: (r) => formatKes(r.amountKes) },
      { key: "status", header: "Status", render: (r) => status(r.status) },
      { key: "by", header: "By", className: "min-w-40 whitespace-normal", render: (r) => r.refundedBy ?? "—" },
      {
        key: "recorded",
        header: "In Admobi",
        render: (r) =>
          r.recorded ? (
            <StatusPill tone="good">Debited</StatusPill>
          ) : (
            <StatusPill tone="serious">Not recorded: press Sync refunds</StatusPill>
          ),
      },
    ],
    disputes: [
      { key: "date", header: "Opened", render: (d) => when(d.createdAt) },
      { key: "tx", header: "Payment", render: (d) => d.transactionReference ?? "—" },
      { key: "amount", header: "Amount", align: "right", render: (d) => formatKes(d.amountKes) },
      { key: "category", header: "Category", render: (d) => (d.category ? label(d.category) : "—") },
      { key: "status", header: "Status", render: (d) => status(d.status) },
      { key: "due", header: "Respond by", render: (d) => when(d.dueAt) },
      { key: "resolution", header: "Resolution", render: (d) => (d.resolution ? label(d.resolution) : "—") },
    ],
  }
}

const EMPTY: Record<PaystackResource, string> = {
  transactions: "No Paystack transactions in this period.",
  settlements: "No settlements yet. Paystack settles collected money to the bank on its schedule.",
  transfers: "No transfers. Driver payouts sent from the Payouts tab appear here.",
  refunds: "No refunds.",
  disputes: "No disputes. A chargeback would appear here with its response deadline.",
}

/**
 * Finances → Paystack: the Paystack dashboard inside ops, live (never cached), with each row
 * matched to our own records so a payment Paystack took but we never credited stands out.
 */
export function PaystackTab({ range }: { range: DateRangeKey }) {
  const client = useOpsClient()
  const [view, setView] = useState<PaystackResource>("transactions")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [summary, setSummary] = useState<PaystackSummaryDto | null | "error">(null)
  const [data, setData] = useState<PaystackPageDto<PaystackRowDto[PaystackResource]> | null | "error">(null)
  const [syncing, startSync] = useTransition()
  const [exporting, startExport] = useTransition()
  const reload = () => setReloadKey((k) => k + 1)

  const days = DAYS[range]
  const from = days == null ? undefined : new Date(Date.now() - days * 86_400_000).toISOString()

  useEffect(() => {
    let live = true
    setSummary(null)
    client.finance.paystack
      .summary({ from })
      .then((s) => live && setSummary(s))
      .catch(() => live && setSummary("error"))
    return () => {
      live = false
    }
    // `from` is derived from range; keying on range keeps it from refetching every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, range, reloadKey])

  useEffect(() => {
    let live = true
    setData(null)
    const term = view === "transactions" ? search.trim() : ""
    client.finance.paystack
      .list(view, {
        page,
        perPage: PER_PAGE,
        from: term ? undefined : from,
        status: statusFilter === "all" ? undefined : statusFilter,
        ...(term.includes("@") ? { email: term } : term ? { reference: term } : {}),
      })
      .then((d) => live && setData(d))
      .catch(() => live && setData("error"))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, view, page, statusFilter, search, range, reloadKey])

  const switchView = (v: string) => {
    setView(v as PaystackResource)
    setStatusFilter("all")
    setPage(1)
    setQuery("")
    setSearch("")
  }

  const s = summary && summary !== "error" ? summary : null
  const kpi = (v: number | undefined) => (summary === "error" ? "Unavailable" : v == null ? "…" : formatKes(v))
  const rows = data && data !== "error" ? data.rows : []
  const statuses = STATUSES[view]

  return (
    <div className="grid gap-4">
      <KpiStrip
        columns={4}
        items={[
          { label: "Transfer balance", value: kpi(s?.balanceKes), note: "What driver payouts are sent from" },
          { label: "Waiting to settle", value: kpi(s?.waitingToSettleKes), note: "Collected, not yet settled by Paystack" },
          { label: "Collected", value: kpi(s?.volumeKes), note: "Successful payments in the period" },
          { label: "Payments", value: summary === "error" ? "Unavailable" : s ? String(s.transactionCount) : "…", note: "Successful, in the period" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <DashboardTabs tabs={VIEWS} value={view} onChange={switchView} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={syncing}
            loadingText="Syncing…"
            onClick={() =>
              startSync(async () => {
                try {
                  const { imported = 0 } = await client.finance.paystack.sync({ refunds: true })
                  toast.success(imported ? `Imported ${imported} refund${imported === 1 ? "" : "s"} from Paystack` : "Refunds are in sync")
                  await refreshFinance()
                  reload()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't sync refunds")
                }
              })
            }
          >
            <RefreshCw aria-hidden />
            Sync refunds
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={exporting}
            loadingText="Preparing…"
            onClick={() =>
              startExport(async () => {
                try {
                  const { url } = await client.finance.paystack.exportCsv({ from, status: view === "transactions" && statusFilter !== "all" ? statusFilter : undefined })
                  window.open(url, "_blank", "noopener")
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't export from Paystack")
                }
              })
            }
          >
            <Download aria-hidden />
            Export transactions
          </Button>
        </div>
      </div>

      <LedgerCard<PaystackRowDto[PaystackResource]>
        title={VIEWS.find((v) => v.value === view)!.label}
        description="Live from Paystack. The In Admobi column shows whether our records agree"
        filterTabs={
          statuses
            ? {
                tabs: [{ value: "all", label: "All" }, ...statuses.map((v) => ({ value: v, label: label(v) }))],
                value: statusFilter,
                onChange: (v) => {
                  setStatusFilter(v)
                  setPage(1)
                },
              }
            : undefined
        }
        toolbar={
          view === "transactions" ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setSearch(query)
                setPage(1)
              }}
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Exact reference or payer email"
                aria-label="Find a Paystack transaction by reference or payer email"
                className="h-8 w-64"
              />
              <Button type="submit" size="sm" variant="outline" aria-label="Find">
                <Search aria-hidden />
              </Button>
            </form>
          ) : undefined
        }
        columns={columns(reload)[view] as LedgerColumn<PaystackRowDto[PaystackResource]>[]}
        rows={rows}
        rowKey={(r) => String(r.id)}
        footer={
          data && data !== "error"
            ? {
                viewing: `Page ${data.page} of ${data.pageCount} · ${data.total} in all`,
                page: data.page,
                pageCount: data.pageCount,
                onPageChange: setPage,
              }
            : undefined
        }
        empty={data === "error" ? "Couldn't reach Paystack. Try again in a moment." : data == null ? "Loading from Paystack…" : EMPTY[view]}
      />
    </div>
  )
}

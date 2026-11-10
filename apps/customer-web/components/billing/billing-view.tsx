"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { DashboardTabs } from "@workspace/ui/components/dashboard/dashboard-tabs"
import { DashboardToolbar } from "@workspace/ui/components/dashboard/dashboard-toolbar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { ToolbarSkeleton } from "@workspace/ui/components/dashboard/dashboard-skeletons"
import { BillingTabSkeleton } from "@/components/skeletons/dashboard-skeletons"
import { BillingOverviewTab } from "@/components/billing/billing-overview-tab"
import { InvoicesTab } from "@/components/billing/invoices-tab"
import { StatementsTab } from "@/components/billing/statements-tab"
import { TransactionsTab } from "@/components/billing/transactions-tab"
import type { FinanceSummaryDto } from "@workspace/ops-contracts"
import { cleanKes, KesAmountInput, kesValue } from "@/components/billing/kes-amount-input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { useFinanceSummary } from "@/lib/use-analytics"
import { useRequestRefund, useTopUp } from "@/lib/use-payments"
import { useDashboardParams } from "@/lib/use-dashboard-params"
import { useOrgPermissions } from "@/lib/use-org"

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "transactions", label: "Transactions" },
  { value: "invoices", label: "Invoices" },
  { value: "statements", label: "Statements" },
]

/** Invoices and statements list everything, so the date range only applies to these tabs. */
const RANGE_TABS = new Set(["overview", "transactions"])

const kes = (n: number) => `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`

export const TOP_UP_MIN_KES = 100
export const TOP_UP_MAX_KES = 1_000_000
const PRESETS = [5_000, 10_000, 25_000, 50_000]

type Suggestion = { amount: number; label: string }

/** What this account actually needs first (a shortfall, then the next charge), then round presets. */
export function topUpSuggestions(summary: FinanceSummaryDto | undefined): Suggestion[] {
  const out: Suggestion[] = []
  const fit = (n: number) => Math.min(TOP_UP_MAX_KES, Math.max(TOP_UP_MIN_KES, Math.ceil(n)))
  const available = summary?.availableKes ?? null
  if (available !== null && available < 0) out.push({ amount: fit(-available), label: "Covers the shortfall" })
  const next = summary?.funding.nextChargeKes ?? null
  if (out.length === 0 && next !== null && next > (available ?? 0)) {
    out.push({ amount: fit(next - Math.max(0, available ?? 0)), label: "Covers the next charge" })
  }
  for (const amount of PRESETS) {
    if (out.length >= 4) break
    if (!out.some((s) => s.amount === amount)) out.push({ amount, label: "" })
  }
  return out
}

function topUpProblem(value: number): string | null {
  if (!Number.isFinite(value)) return null
  if (value < TOP_UP_MIN_KES) return `The smallest top-up is ${kes(TOP_UP_MIN_KES)}.`
  if (value > TOP_UP_MAX_KES) {
    return `The most you can top up at once is ${kes(TOP_UP_MAX_KES)}. For more, ask your account manager about a bank transfer.`
  }
  return null
}

/** Top-up by M-Pesa or card: amount, then off to Paystack's hosted checkout. */
export function TopUpDialog({
  open,
  onOpenChange,
  summary,
  initialAmount = "",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When loaded, powers the suggestions and the balance-after line. */
  summary?: FinanceSummaryDto
  /** Clean digits to start from, e.g. after a failed payment. */
  initialAmount?: string
}) {
  const topUp = useTopUp()
  const [amount, setAmount] = useState(initialAmount)
  const [prevInitial, setPrevInitial] = useState(initialAmount)
  if (initialAmount !== prevInitial) {
    setPrevInitial(initialAmount)
    setAmount(initialAmount)
  }
  const value = kesValue(amount)
  const problem = topUpProblem(value)
  const valid = Number.isFinite(value) && problem === null
  const suggestions = topUpSuggestions(summary)
  const available = summary ? Math.max(0, summary.availableKes ?? 0) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) topUp.mutate(value)
          }}
        >
          <DialogHeader>
            <DialogTitle>Top up your balance</DialogTitle>
            <DialogDescription>Pay by M-Pesa or card. The money is yours to spend on any campaign.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Label htmlFor="top-up-amount" className="sr-only">
              Amount in KES
            </Label>
            <KesAmountInput
              id="top-up-amount"
              autoFocus
              placeholder="0"
              value={amount}
              onValueChange={setAmount}
              aria-invalid={problem ? true : undefined}
              aria-describedby="top-up-hint"
            />
            <p
              id="top-up-hint"
              aria-live="polite"
              className={problem ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
            >
              {problem ?? `Whole shillings, ${kes(TOP_UP_MIN_KES)} to ${kes(TOP_UP_MAX_KES)}.`}
            </p>

            <div role="group" aria-label="Quick amounts" className="flex flex-wrap gap-2">
              {suggestions.map((s) => {
                const active = value === s.amount
                return (
                  <Button
                    key={s.amount}
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={active}
                    onClick={() => setAmount(String(s.amount))}
                    className="h-auto min-h-8 flex-col items-start gap-0 py-1.5 tabular-nums aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
                  >
                    <span>{kes(s.amount)}</span>
                    {s.label ? <span className="text-[11px] font-normal text-muted-foreground">{s.label}</span> : null}
                  </Button>
                )
              })}
            </div>
          </div>

          {available !== null ? (
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Available now</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{kes(available)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">After this top-up</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-primary">
                  {valid ? kes(available + value) : "—"}
                </dd>
              </div>
            </dl>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Next, Paystack&apos;s secure page opens to finish the payment, then you come back here for the receipt.
            M-Pesa caps each payment; use a card for large amounts.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!valid}
              loading={topUp.isPending || topUp.isSuccess}
              loadingText="Opening Paystack…"
              className="tabular-nums"
            >
              {valid ? `Pay ${kes(value)}` : "Enter an amount"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Unused credit goes back to the original payment method after ops approves (spec §5.5). */
export function RefundRequestDialog({
  open,
  onOpenChange,
  availableKes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableKes: number
}) {
  const request = useRequestRefund()
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const value = kesValue(amount)
  const tooMuch = value > availableKes
  const valid = value > 0 && !tooMuch

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            if (!valid) return
            request.mutate(
              { amountKes: value, note: note.trim() || undefined },
              { onSuccess: () => onOpenChange(false) },
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>Request a refund</DialogTitle>
            <DialogDescription>
              Unused credit goes back to the M-Pesa number or card you paid with, after our team approves it. It can
              take up to 10 business days to arrive.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="refund-amount" className="sr-only">
              Refund amount in KES
            </Label>
            <KesAmountInput
              id="refund-amount"
              decimals
              autoFocus
              placeholder="0"
              value={amount}
              onValueChange={setAmount}
              aria-invalid={tooMuch ? true : undefined}
              aria-describedby="refund-hint"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                id="refund-hint"
                aria-live="polite"
                className={tooMuch ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
              >
                {tooMuch ? `That's more than you have. You can request up to ${kes(availableKes)}.` : `Up to ${kes(availableKes)} available.`}
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 tabular-nums"
                onClick={() => setAmount(cleanKes(String(availableKes), true))}
              >
                Refund all {kes(availableKes)}
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="refund-note">Note (optional)</Label>
            <Textarea id="refund-note" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid} loading={request.isPending} loadingText="Sending…" className="tabular-nums">
              {valid ? `Request ${kes(value)}` : "Request refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Finance & Billing. Tabs and range live in the URL. Without `billing:read` it shows a plain
 * access message and issues no request, so a Member never meets a 403.
 */
export function BillingView() {
  const { can, isLoading: orgLoading } = useOrgPermissions()
  const canRead = can("billing:read")
  const { tab, setTab, range, setRange } = useDashboardParams("overview")
  // `?topup=5000` (a failed top-up's Try again) reopens the dialog with that amount.
  const searchParams = useSearchParams()
  const [initialTopUp] = useState(() => cleanKes(searchParams.get("topup") ?? "", false))
  const [topUpOpen, setTopUpOpen] = useState(initialTopUp !== "")
  const [refundOpen, setRefundOpen] = useState(false)
  const canWrite = can("billing:write")
  useEffect(() => {
    if (!searchParams.has("topup")) return
    const next = new URLSearchParams(searchParams.toString())
    next.delete("topup")
    const query = next.toString()
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`)
  }, [searchParams])

  const activeTab = TABS.some((t) => t.value === tab) ? tab : "overview"
  const summary = useFinanceSummary(range, { enabled: canRead && (activeTab === "overview" || topUpOpen) })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Finance &amp; Billing</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your funds, spending, invoices and statements.
          </p>
        </div>
        {/* The overview carries Top up beside the funding answer; other tabs keep it here. */}
        {!orgLoading && canRead && canWrite && activeTab !== "overview" ? (
          <Button className="self-start sm:self-auto" onClick={() => setTopUpOpen(true)}>
            <Plus aria-hidden />
            Top up
          </Button>
        ) : null}
      </div>

      {orgLoading ? (
        <>
          <ToolbarSkeleton tabs={TABS.length} />
          <BillingTabSkeleton tab={activeTab} />
        </>
      ) : !canRead ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ask your account owner for billing access.
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardToolbar
            view={<DashboardTabs tabs={TABS} value={activeTab} onChange={setTab} />}
            range={range}
            onRangeChange={setRange}
            hideRange={!RANGE_TABS.has(activeTab)}
          />

          {activeTab === "transactions" ? (
            <TransactionsTab range={range} />
          ) : activeTab === "invoices" ? (
            <InvoicesTab />
          ) : activeTab === "statements" ? (
            <StatementsTab />
          ) : summary.isError ? (
            <ApiErrorBanner
              message={summary.error instanceof Error ? summary.error.message : "Could not load your finances."}
              onRetry={() => void summary.refetch()}
            />
          ) : !summary.data ? (
            <BillingTabSkeleton tab="overview" />
          ) : (
            <BillingOverviewTab
              summary={summary.data}
              range={range}
              onTopUp={canWrite ? () => setTopUpOpen(true) : undefined}
              onRequestRefund={
                canWrite && (summary.data.availableKes ?? 0) > 0 ? () => setRefundOpen(true) : undefined
              }
            />
          )}
        </>
      )}

      {canWrite ? (
        <TopUpDialog
          open={topUpOpen}
          onOpenChange={setTopUpOpen}
          summary={summary.data}
          initialAmount={initialTopUp}
        />
      ) : null}
      {summary.data ? (
        <RefundRequestDialog
          open={refundOpen}
          onOpenChange={setRefundOpen}
          availableKes={Math.max(0, summary.data.availableKes ?? 0)}
        />
      ) : null}
    </div>
  )
}

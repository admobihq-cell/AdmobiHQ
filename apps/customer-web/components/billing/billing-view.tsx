"use client"

import { useState } from "react"
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
import { Input } from "@workspace/ui/components/input"
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

const parseKes = (value: string) => Number(value.replace(/[^0-9.]/g, ""))
const kes = (n: number) => `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`

/** Top-up by M-Pesa or card: amount, then off to Paystack's hosted checkout. */
export function TopUpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const topUp = useTopUp()
  const [amount, setAmount] = useState("")
  const value = parseKes(amount)
  const valid = Number.isInteger(value) && value >= 100 && value <= 1_000_000

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) topUp.mutate(value)
          }}
        >
          <DialogHeader>
            <DialogTitle>Top up your balance</DialogTitle>
            <DialogDescription>
              Paid by M-Pesa or card through Paystack. M-Pesa is limited per transaction by Safaricom; use a card for
              larger amounts. For a bank transfer, contact your account manager.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="top-up-amount">Amount (KES)</Label>
            <Input
              id="top-up-amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="10,000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby="top-up-hint"
            />
            <p id="top-up-hint" className="text-xs text-muted-foreground">
              Whole shillings, from KES 100 to KES 1,000,000.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!valid}
              loading={topUp.isPending || topUp.isSuccess}
              loadingText="Opening payment…"
            >
              {valid ? `Pay ${kes(value)}` : "Pay"}
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
  const value = parseKes(amount)
  const valid = value > 0 && value <= availableKes

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
              take up to 10 business days to arrive. You can request up to {kes(availableKes)}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="refund-amount">Amount (KES)</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Button type="button" variant="link" size="sm" className="justify-self-start px-0" onClick={() => setAmount(String(availableKes))}>
              Refund everything available
            </Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="refund-note">Note (optional)</Label>
            <Textarea id="refund-note" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid} loading={request.isPending} loadingText="Sending…">
              Request refund
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
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const canWrite = can("billing:write")

  const activeTab = TABS.some((t) => t.value === tab) ? tab : "overview"
  const summary = useFinanceSummary(range, { enabled: canRead && activeTab === "overview" })

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
        {!orgLoading && canRead && canWrite ? (
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
              onNavigate={setTab}
            />
          )}
        </>
      )}

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
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

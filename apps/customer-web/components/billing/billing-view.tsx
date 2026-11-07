"use client"

import { useState } from "react"

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
import { useFinanceSummary } from "@/lib/use-analytics"
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

export function TopUpNoticeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top up your wallet</DialogTitle>
          <DialogDescription>
            Online payments are coming soon. Your account manager can add funds to your wallet today.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
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

  const activeTab = TABS.some((t) => t.value === tab) ? tab : "overview"
  const summary = useFinanceSummary(range, { enabled: canRead && activeTab === "overview" })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight">Finance &amp; Billing</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your funds, spending, invoices and statements.
        </p>
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
              onTopUp={() => setTopUpOpen(true)}
              onNavigate={setTab}
            />
          )}
        </>
      )}

      <TopUpNoticeDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  )
}

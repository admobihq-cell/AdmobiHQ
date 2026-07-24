"use client"

import { useState } from "react"
import {
  ArrowLeftRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  EyeOff,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { ComingSoonDialog } from "@/components/coming-soon-dialog"
import { StatCard } from "@/components/ui/stat-card"
import { SectionHeading } from "@/components/ui/section-heading"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  PLATFORM_ACTIVE_WALLETS,
  PLATFORM_MONEY_IN_30D,
  PLATFORM_MONEY_OUT_30D,
  PLATFORM_TRANSACTIONS,
  PLATFORM_WALLET_BALANCE,
} from "@/lib/placeholder-data"

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

const primaryActionTrigger =
  "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"

export function FinanceView() {
  const [hidden, setHidden] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Operations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Finances</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Platform wallet, campaign top-ups, and driver payouts across all
          customers. Placeholder data — connects to live billing once the
          finance API ships.
        </p>
      </div>

      <Card className="border-0 bg-primary text-primary-foreground shadow-none">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/85">
              <Wallet className="size-4" aria-hidden />
              Platform wallet balance
            </div>
            <button
              type="button"
              onClick={() => setHidden((v) => !v)}
              className="rounded-full p-1.5 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10"
              aria-label={hidden ? "Show balance" : "Hide balance"}
            >
              {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-4xl font-semibold tracking-tight">
              {hidden ? "••••••••" : formatCurrency(PLATFORM_WALLET_BALANCE)}
            </p>
            <p className="text-sm text-primary-foreground/75">
              Held across {PLATFORM_ACTIVE_WALLETS} active campaign wallets
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4">
            <ComingSoonDialog
              label="Top up"
              icon={ArrowUpCircle}
              body="Top up a customer's campaign wallet on their behalf. Manual adjustments are coming in a future update."
              triggerClassName={primaryActionTrigger}
            />
            <ComingSoonDialog
              label="Payout"
              icon={ArrowDownCircle}
              body="Release a driver payout batch. Coming soon."
              triggerClassName={primaryActionTrigger}
            />
            <ComingSoonDialog
              label="Transfer"
              icon={ArrowLeftRight}
              body="Move funds between campaign wallets or reverse a payout. Coming soon."
              triggerClassName={primaryActionTrigger}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={TrendingUp}
          label="Money in · 30d"
          value={formatCurrency(PLATFORM_MONEY_IN_30D)}
          hint="Customer top-ups and charges"
        />
        <StatCard
          icon={TrendingDown}
          label="Money out · 30d"
          value={formatCurrency(PLATFORM_MONEY_OUT_30D)}
          hint="Driver payouts and refunds"
        />
      </div>

      <div className="space-y-4">
        <SectionHeading
          title="Recent transactions"
          description="Platform-wide wallet activity across all customers and drivers"
        />
        <Card className="shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLATFORM_TRANSACTIONS.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Receipt
                          className={
                            tx.kind === "credit"
                              ? "size-4 text-primary"
                              : "size-4 text-destructive"
                          }
                          aria-hidden
                        />
                        {tx.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tx.meta}</TableCell>
                    <TableCell
                      className={
                        tx.kind === "credit"
                          ? "text-right font-medium text-emerald-600 dark:text-emerald-400"
                          : "text-right font-medium text-destructive"
                      }
                    >
                      {tx.kind === "credit" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

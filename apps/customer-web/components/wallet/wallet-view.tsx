"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  Plus,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react"

import { ComingSoonDialog } from "@/components/coming-soon-dialog"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import {
  SPEND_BY_CAMPAIGN,
  WALLET_BALANCE,
  WALLET_LOW_BALANCE_THRESHOLD,
  WALLET_TRANSACTIONS,
} from "@/lib/placeholder-data"

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

export function WalletView() {
  const [hidden, setHidden] = useState(false)
  const isLow = WALLET_BALANCE < WALLET_LOW_BALANCE_THRESHOLD

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Billing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Wallet</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Fund your campaigns and track spend. Placeholder data — top-ups and
          invoices will connect to live billing once payments ship.
        </p>
      </div>

      <Card className="border-0 bg-primary text-primary-foreground shadow-none">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/85">
              <WalletIcon className="size-4" aria-hidden />
              Campaign wallet balance
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
              {hidden ? "••••••••" : formatCurrency(WALLET_BALANCE)}
            </p>
            <p className="text-sm text-primary-foreground/75">
              Auto-reload is off · 3 active campaigns
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4">
            <ComingSoonDialog
              label="Top up"
              icon={Plus}
              body="Add funds via M-Pesa or card. Wallet top-ups are coming in a future update."
              triggerClassName="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            />
            <ComingSoonDialog
              label="Auto reload"
              icon={RefreshCw}
              body="Automatically top up your wallet when the balance runs low. Coming soon."
              triggerClassName="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            />
            <ComingSoonDialog
              label="Statement"
              icon={Download}
              body="Download a PDF statement of your wallet activity. Coming soon."
              triggerClassName="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            />
          </div>
        </CardContent>
      </Card>

      {isLow ? (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-destructive">
            Low balance — top up to keep your campaigns running without
            interruption.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Spend by campaign · 30d
          </p>
          <Card className="shadow-none">
            <CardContent className="p-0">
              {SPEND_BY_CAMPAIGN.map((campaign, index) => (
                <div key={campaign.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <TrendingDown className="size-4 text-primary" aria-hidden />
                    </div>
                    <p className="flex-1 text-sm font-medium">{campaign.name}</p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatCurrency(campaign.spend)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent transactions
            </p>
          </div>
          <Card className="shadow-none">
            <CardContent className="p-0">
              {WALLET_TRANSACTIONS.map((tx, index) => (
                <div key={tx.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className="flex items-center gap-3 p-4">
                    <div
                      className={
                        tx.kind === "credit"
                          ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary"
                          : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10"
                      }
                    >
                      {tx.kind === "credit" ? (
                        <TrendingUp className="size-4 text-primary" aria-hidden />
                      ) : (
                        <Receipt className="size-4 text-destructive" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">{tx.meta}</p>
                    </div>
                    <p
                      className={
                        tx.kind === "credit"
                          ? "text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                          : "text-sm font-semibold text-destructive"
                      }
                    >
                      {tx.kind === "credit" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

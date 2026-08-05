"use client"

import { useEffect, useState } from "react"
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

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import {
  OLDER_WALLET_TRANSACTIONS,
  SPEND_BY_CAMPAIGN,
  WALLET_LOW_BALANCE_THRESHOLD,
  WALLET_TRANSACTIONS,
} from "@/lib/placeholder-data"
import {
  formatCurrency,
  getAutoReloadSettings,
  getWalletBalance,
  PLACEHOLDER_ACTIVE_CAMPAIGN_COUNT,
  PLACEHOLDER_WALLET_BALANCE,
  setAutoReloadSettings,
  topUpWallet,
  type AutoReloadSettings,
} from "@/lib/wallet"

const TOPUP_PRESETS = [5000, 10000, 20000, 50000]

type Panel = "topup" | "autoreload" | null

export function WalletView() {
  const [hidden, setHidden] = useState(false)
  const [balance, setBalance] = useState(PLACEHOLDER_WALLET_BALANCE)
  const [autoReload, setAutoReload] = useState<AutoReloadSettings | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [thresholdInput, setThresholdInput] = useState("")
  const [showOlderTransactions, setShowOlderTransactions] = useState(false)

  useEffect(() => {
    const reload = getAutoReloadSettings()
    setBalance(getWalletBalance())
    setAutoReload(reload)
    setThresholdInput(String(reload.threshold))
  }, [])

  const isLow = balance < WALLET_LOW_BALANCE_THRESHOLD

  function handleTopUp(amount: number) {
    if (!amount || amount <= 0) return
    setBalance(topUpWallet(amount))
    setPanel(null)
    setTopUpAmount("")
  }

  function handleSaveAutoReload(enabled: boolean) {
    const threshold = Number(thresholdInput.replace(/[^0-9]/g, "")) || 20000
    const next: AutoReloadSettings = { enabled, threshold, topUpAmount: 30000 }
    setAutoReloadSettings(next)
    setAutoReload(next)
  }

  const visibleTransactions = showOlderTransactions
    ? [...WALLET_TRANSACTIONS, ...OLDER_WALLET_TRANSACTIONS]
    : WALLET_TRANSACTIONS

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Billing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Wallet</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Fund your campaigns and track spend. Top-ups here are saved on this device.
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
              {hidden ? "••••••••" : formatCurrency(balance)}
            </p>
            <p className="text-sm text-primary-foreground/75">
              Auto-reload is {autoReload?.enabled ? "on" : "off"} ·{" "}
              {PLACEHOLDER_ACTIVE_CAMPAIGN_COUNT} active campaigns
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 border-primary-foreground/20 bg-primary-foreground/10 py-4 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setPanel(panel === "topup" ? null : "topup")}
            >
              <Plus className="size-5" aria-hidden />
              <span className="text-xs font-medium">Top up</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 border-primary-foreground/20 bg-primary-foreground/10 py-4 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setPanel(panel === "autoreload" ? null : "autoreload")}
            >
              <RefreshCw className="size-5" aria-hidden />
              <span className="text-xs font-medium">Auto reload</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 border-primary-foreground/20 bg-primary-foreground/10 py-4 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setShowOlderTransactions(true)}
            >
              <Download className="size-5" aria-hidden />
              <span className="text-xs font-medium">Statement</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {panel === "topup" ? (
        <Card className="shadow-none">
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-semibold">Top up wallet</p>
            <div className="flex flex-wrap gap-2">
              {TOPUP_PRESETS.map((amount) => {
                const active = topUpAmount === String(amount)
                return (
                  <Button
                    key={amount}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={cn(!active && "text-muted-foreground")}
                    onClick={() => setTopUpAmount(String(amount))}
                  >
                    {formatCurrency(amount)}
                  </Button>
                )
              })}
            </div>
            <Input
              value={topUpAmount}
              onChange={(event) => setTopUpAmount(event.target.value)}
              placeholder="Custom amount (KES)"
              inputMode="numeric"
            />
            <Button
              type="button"
              onClick={() => handleTopUp(Number(topUpAmount.replace(/[^0-9]/g, "")))}
            >
              Add funds
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {panel === "autoreload" && autoReload ? (
        <Card className="shadow-none">
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-semibold">Auto reload</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reload-enabled" className="text-sm font-medium">
                Reload automatically
              </Label>
              <Checkbox
                id="auto-reload-enabled"
                checked={autoReload.enabled}
                onCheckedChange={(checked) => handleSaveAutoReload(checked === true)}
              />
            </div>
            <Input
              value={thresholdInput}
              onChange={(event) => setThresholdInput(event.target.value)}
              placeholder="Reload when balance drops below (KES)"
              inputMode="numeric"
              onBlur={() => handleSaveAutoReload(autoReload.enabled)}
            />
          </CardContent>
        </Card>
      ) : null}

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
              {SPEND_BY_CAMPAIGN.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No spend recorded in the last 30 days.
                </p>
              ) : null}
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
            {!showOlderTransactions ? (
              <button
                type="button"
                onClick={() => setShowOlderTransactions(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                See all
              </button>
            ) : null}
          </div>
          <Card className="shadow-none">
            <CardContent className="p-0">
              {visibleTransactions.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No transactions yet.
                </p>
              ) : null}
              {visibleTransactions.map((tx, index) => (
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

      <p className="text-center text-xs text-muted-foreground">
        Placeholder data. Top-ups and auto-reload are saved on this browser only — nothing here
        moves real money.
      </p>
    </div>
  )
}

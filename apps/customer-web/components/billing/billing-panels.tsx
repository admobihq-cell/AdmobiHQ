"use client"

import Link from "next/link"
import { ChevronRight, Download, FileText, Headset, Megaphone, PiggyBank, Zap, type LucideIcon } from "lucide-react"
import { exportFileName, formatKes, type FinanceSummaryDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { DeltaPill } from "@workspace/ui/components/dashboard/delta-pill"
import { StatusPill, type StatusTone } from "@workspace/ui/components/dashboard/status-pill"
import { transactionsPath, type RangeParams } from "@/lib/analytics-client"
import { useDownloadPdf } from "@/lib/use-campaigns"
import { cn } from "@workspace/ui/lib/utils"

const LEVEL: Record<Exclude<FinanceSummaryDto["funding"]["level"], "untracked">, { tone: StatusTone; label: string }> = {
  healthy: { tone: "good", label: "Healthy" },
  low: { tone: "warning", label: "Running low" },
  short: { tone: "serious", label: "Short of funds" },
}

/** "14 Dec", counting from today. */
function runOutDate(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000)
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" })
}

/** The headline and its explanation, in the advertiser's terms: covered until when, or short by how much. */
function fundingCopy(summary: FinanceSummaryDto): { headline: string; detail: string } {
  const { funding } = summary
  const available = summary.availableKes ?? 0
  if (funding.level === "untracked") {
    return {
      headline: "Top up to start running campaigns",
      detail: "Your balance, and how long it lasts at your pace of spend, appear after your first top-up.",
    }
  }
  if (available < 0 && summary.committedKes === 0) {
    return {
      headline: `Your balance is ${formatKes(-available)} below zero`,
      detail: "More has gone out than you paid in; the breakdown below shows where. Anything you pay next covers this first.",
    }
  }
  if (funding.level === "short") {
    return {
      headline: `Your active budgets need ${formatKes(-available)} more than you have`,
      detail: "Top up to keep every live and scheduled campaign running.",
    }
  }
  if (funding.runwayDays === null) {
    return {
      headline: `${formatKes(available)} available`,
      detail: "There is no recent spending to project a run-out date from.",
    }
  }
  const pace = `${formatKes(available)} available, about ${funding.runwayDays} day${funding.runwayDays === 1 ? "" : "s"} at your last 30 days of spend.`
  return funding.level === "low"
    ? { headline: `Your funds run out around ${runOutDate(funding.runwayDays)}`, detail: `Top up soon to keep campaigns running. ${pace}` }
    : { headline: `You're covered until about ${runOutDate(funding.runwayDays)}`, detail: pace }
}

/**
 * Every shilling since the account opened, as a running sum: what came in, what went back out,
 * what campaigns used, then what's held. It adds up exactly to Available, so a surprising
 * balance (a negative one, say) explains itself.
 */
export function MoneyBreakdown({ summary, className }: { summary: FinanceSummaryDto; className?: string }) {
  const { paidInKes, refundedKes, spentKes, adjustmentsKes } = summary.lifetime
  const rows: Array<{ label: string; note: string; value: number; total?: boolean }> = [
    { label: "Paid in", note: "Top-ups and campaign payments", value: paidInKes },
    ...(refundedKes ? [{ label: "Refunded to you", note: "Sent back to M-Pesa or card", value: -refundedKes }] : []),
    { label: "Spent on campaigns", note: "Charged as your flights ran", value: -spentKes },
    ...(adjustmentsKes ? [{ label: "Adjustments", note: "Corrections and failed refunds returned", value: adjustmentsKes }] : []),
    { label: "Balance", note: "What's in your account", value: summary.balanceKes, total: true },
    { label: "Held for campaigns", note: "Unspent budget of submitted, approved and live campaigns", value: -summary.committedKes },
    { label: "Available", note: "Yours to use on a new campaign or refund", value: summary.availableKes ?? summary.balanceKes, total: true },
  ]
  return (
    <dl className={cn("flex min-w-0 flex-col text-sm", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn("flex items-baseline justify-between gap-4 py-1.5", row.total && "border-t font-semibold")}
        >
          <dt className="min-w-0">
            {row.label}
            {row.total ? null : <span className="block text-xs font-normal text-muted-foreground">{row.note}</span>}
          </dt>
          <dd className={cn("shrink-0 tabular-nums", row.value < 0 && row.total && "text-destructive")}>
            {formatKes(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The answer people open billing for: is the account funded, and until when. Leads the overview,
 * with the figures behind it underneath and the money actions beside it.
 */
export function FundingStatement({
  summary,
  onTopUp,
  onRequestRefund,
}: {
  summary: FinanceSummaryDto
  onTopUp?: () => void
  onRequestRefund?: () => void
}) {
  const { headline, detail } = fundingCopy(summary)
  const level = summary.funding.level === "untracked" ? null : LEVEL[summary.funding.level]


  return (
    <Card className="shadow-xs">
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            {level ? <StatusPill tone={level.tone} className="self-start">{level.label}</StatusPill> : null}
            <h2 className="text-2xl font-semibold tracking-tight text-balance">{headline}</h2>
            <p className="max-w-prose text-sm text-muted-foreground">{detail}</p>
          </div>
          {onTopUp || onRequestRefund ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {onRequestRefund ? (
                <Button variant="outline" onClick={onRequestRefund}>
                  Request refund
                </Button>
              ) : null}
              {onTopUp ? (
                <Button onClick={onTopUp}>
                  <PiggyBank data-icon="inline-start" />
                  Top up
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-6 border-t pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          <MoneyBreakdown summary={summary} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Spent in the selected period</p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold tabular-nums">{formatKes(summary.spentKes.current)}</span>
              <DeltaPill delta={summary.spentKes} good="neutral" />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** The square icon tile that leads each upcoming-charge row. */
function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-11 shrink-0 place-items-center rounded-xl border bg-muted/50 text-muted-foreground", className)}
    >
      <Icon className="size-5" />
    </span>
  )
}

/** Planned spend on campaigns that have not started: a headline total, then one row per campaign. */
export function UpcomingChargesCard({ summary }: { summary: FinanceSummaryDto }) {
  const charges = summary.upcomingCharges
  const total = charges.reduce((sum, c) => sum + c.remainingKes, 0)
  const { nextChargeKes, nextChargeOn } = summary.funding

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Upcoming charges</CardTitle>
        <CardDescription>Planned spend on scheduled campaigns, not a bill</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {charges.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No scheduled campaigns have budget waiting to start.
          </p>
        ) : (
          <>
            <div>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatKes(total)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Across <span className="font-medium text-foreground">{charges.length}</span>{" "}
                {charges.length === 1 ? "scheduled campaign" : "scheduled campaigns"}
              </p>
            </div>
            {nextChargeKes !== null && nextChargeOn ? (
              <div className="flex w-fit max-w-full items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <Zap aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  Next charge <span className="font-semibold tabular-nums">{formatKes(nextChargeKes)}</span> on {nextChargeOn}
                </span>
              </div>
            ) : null}
            <ul className="flex flex-col gap-2">
              {charges.slice(0, 3).map((charge) => (
                <li key={charge.campaignId}>
                  <Link
                    href={`/campaigns/${charge.campaignId}`}
                    className="group flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <IconTile icon={Megaphone} className="size-10 bg-background" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{charge.campaignName}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        Starts {charge.startsOn} · {formatKes(charge.remainingKes)}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            {charges.length > 3 ? (
              <p className="text-xs text-muted-foreground">
                and {charges.length - 3} more, {formatKes(charges.slice(3).reduce((sum, c) => sum + c.remainingKes, 0))}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

type ShortcutProps = {
  icon: LucideIcon
  label: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

/** A round icon button over a label. A link when it goes somewhere, a button when it does something. */
function Shortcut({ icon: Icon, label, href, onClick, disabled }: ShortcutProps) {
  const body = (
    <>
      <span className="grid size-14 place-items-center rounded-full border bg-muted/40 text-foreground/80 transition-colors group-hover:bg-muted group-disabled:opacity-50">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="text-center text-xs leading-tight text-muted-foreground">{label}</span>
    </>
  )
  const className =
    "group flex flex-col items-center gap-2 rounded-lg p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed"

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  )
}

/** Only what isn't a tab or a nav item already: the two downloads and a way to ask for help. */
export function ShortcutsCard({ range, hasLedgerRows }: { range: RangeParams; hasLedgerRows: boolean }) {
  const download = useDownloadPdf()
  const busy = download.isPending

  const shortcuts: ShortcutProps[] = [
    {
      icon: FileText,
      label: "Budget statement",
      disabled: busy,
      onClick: () =>
        download.mutate({
          path: "/v1/customer/campaigns/statement",
          filename: exportFileName("campaign budget statement", null, "pdf"),
        }),
    },
    {
      icon: Download,
      label: "Export CSV",
      disabled: busy || !hasLedgerRows,
      onClick: () =>
        download.mutate({
          path: transactionsPath({ range, sort: "date_desc" }, true),
          filename: exportFileName("transactions", null, "csv"),
        }),
    },
    { icon: Headset, label: "Billing help", href: "/settings/support" },
  ]

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Shortcuts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {shortcuts.map((shortcut) => (
            <Shortcut key={shortcut.label} {...shortcut} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

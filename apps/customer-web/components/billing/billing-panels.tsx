"use client"

import Link from "next/link"
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  Download,
  FileText,
  Headset,
  Hourglass,
  Lock,
  Megaphone,
  PiggyBank,
  Receipt,
  ScrollText,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { exportFileName, formatKes, type FinanceSummaryDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
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

/** The square icon tile that closes every row, so rows across the three cards share one rhythm. */
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

/** Runway, committed funds and the next charge, with the funding status at the foot. */
function WalletCard({ summary }: { summary: FinanceSummaryDto }) {
  const { funding } = summary

  if (funding.level === "untracked") {
    return (
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Wallet</CardTitle>
          <CardDescription>Whether your funds cover current spending</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Your funding details appear after your first top-up.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { tone, label } = LEVEL[funding.level]
  const note =
    funding.level === "short"
      ? `Your active budgets are ${formatKes(-(summary.availableKes ?? 0))} more than your balance.`
      : funding.runwayDays === null
        ? "There is no recent spending to project from."
        : `At this pace, funds run out around ${runOutDate(funding.runwayDays)}.`

  const rows: { icon: LucideIcon; title: string; value: string; note: string }[] = [
    {
      icon: Hourglass,
      title: "Runway",
      value: funding.runwayDays === null ? "—" : `${funding.runwayDays} days`,
      note: "Available funds ÷ daily spend",
    },
    {
      icon: Lock,
      title: "Committed",
      value: formatKes(summary.committedKes),
      note: "Left on live and scheduled budgets",
    },
    {
      icon: CalendarClock,
      title: "Next charge",
      value: funding.nextChargeKes === null ? "—" : formatKes(funding.nextChargeKes),
      note: funding.nextChargeOn ?? "Nothing scheduled",
    },
  ]

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
        <CardDescription>Based on your balance and the last 30 days of spend</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.title} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.title}</p>
                <p className="text-lg font-semibold tabular-nums">{row.value}</p>
                <p className="text-xs text-muted-foreground">{row.note}</p>
              </div>
              <IconTile icon={row.icon} />
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-2 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Funding status</span>
            <StatusPill tone={tone}>{label}</StatusPill>
          </div>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Planned spend on campaigns that have not started: a headline total, then one row per campaign. */
function UpcomingChargesCard({ summary }: { summary: FinanceSummaryDto }) {
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
                <span className="min-w-0 truncate">
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
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
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

/** Top up on its own card, then the everyday tasks as an icon grid. */
function ActionCards({
  range,
  hasLedgerRows,
  onTopUp,
  onNavigate,
}: {
  range: RangeParams
  hasLedgerRows: boolean
  onTopUp: () => void
  onNavigate: (tab: string) => void
}) {
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
    { icon: Receipt, label: "Invoices", onClick: () => onNavigate("invoices") },
    { icon: ScrollText, label: "Transactions", onClick: () => onNavigate("transactions") },
    { icon: FileText, label: "Statements", onClick: () => onNavigate("statements") },
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
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Megaphone, label: "Campaigns", href: "/campaigns" },
    { icon: Headset, label: "Support", href: "/settings/support" },
  ]

  return (
    <div className="grid content-start gap-4">
      <Card className="shadow-xs">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Top up</CardTitle>
            <CardDescription className="mt-1">Your account manager adds funds today</CardDescription>
          </div>
          <Button onClick={onTopUp}>
            <PiggyBank data-icon="inline-start" />
            Top up
          </Button>
        </CardContent>
      </Card>
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {shortcuts.map((shortcut) => (
              <Shortcut key={shortcut.label} {...shortcut} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** The foot of the overview: wallet, upcoming charges, and the actions column. */
export function BillingPanels({
  summary,
  range,
  onTopUp,
  onNavigate,
}: {
  summary: FinanceSummaryDto
  range: RangeParams
  onTopUp: () => void
  onNavigate: (tab: string) => void
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WalletCard summary={summary} />
      <UpcomingChargesCard summary={summary} />
      <ActionCards range={range} hasLedgerRows={summary.hasLedgerRows} onTopUp={onTopUp} onNavigate={onNavigate} />
    </div>
  )
}

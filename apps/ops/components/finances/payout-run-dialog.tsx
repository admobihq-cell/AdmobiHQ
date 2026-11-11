"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownCircle } from "lucide-react"
import { toast } from "sonner"
import { disburseBalanceCheck, disburseReceiptTitle, formatKes, settleDisburse } from "@workspace/ops-contracts"
import type { PayoutRunDto } from "@workspace/ops-api-client"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { ReceiptPrinter, useReceiptPrinterStage } from "@workspace/ui/components/receipt-printer"
import { refreshFinance } from "@/app/(dashboard)/finances/actions"
import { useOpsClient } from "@/lib/ops-client"
import { payoutStatus } from "@workspace/ops-contracts"

const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }).slice(0, 7)
const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

/** What actually went to Paystack, frozen at send time (the run reloads underneath it). */
type SentRun = {
  rows: { id: number; name: string; amountKes: number }[]
  skipped: { name: string; reason: string }[]
  totalKes: number
  feesKes: number
  at: Date
}

/**
 * A month's payout run (spec §8.3): ops types each driver's amount and saves the rows as pending,
 * then — with the `payouts` permission — ticks rows and presses Disburse. The confirmation shows
 * the count, total, estimated fees and the live Paystack balance before any money moves.
 */
export function PayoutRunDialog({ canDisburse }: { canDisburse: boolean }) {
  const client = useOpsClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(thisMonth)
  const [run, setRun] = useState<PayoutRunDto | null>(null)
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState<{ balanceKes: number | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<SentRun | null>(null)
  const stage = useReceiptPrinterStage(sent !== null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await client.payouts.getRun(month)
      setRun(data)
      setAmounts(Object.fromEntries(data.drivers.map((d) => [d.driverProfileId, d.payout ? String(d.payout.amountKes) : ""])))
      setSelected(new Set())
    } catch (e) {
      setError(errorText(e, "Could not load the payout run."))
    }
  }, [client, month])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const editable = (status: string | undefined) => status === undefined || status === "pending"
  const sendable = (run?.drivers ?? []).filter((d) => d.payout && (d.payout.status === "pending" || d.payout.status === "failed"))
  const chosen = sendable.filter((d) => selected.has(d.payout!.id))
  const totalKes = chosen.reduce((sum, d) => sum + d.payout!.amountKes, 0)
  const feesKes = chosen.reduce((sum, d) => sum + d.payout!.estimatedFeeKes, 0)

  function save() {
    if (!run) return
    const items = run.drivers
      .filter((d) => editable(d.payout?.status) && Number(amounts[d.driverProfileId]) > 0)
      .map((d) => ({ driverProfileId: d.driverProfileId, amountKes: Number(amounts[d.driverProfileId]) }))
    if (!items.length) return setError("Enter at least one amount above zero.")
    startTransition(async () => {
      try {
        const result = await client.payouts.saveRun({ periodMonth: month, items })
        toast.success(`Saved ${result.saved} pending payout${result.saved === 1 ? "" : "s"}`)
        if (result.skipped.length) toast.warning(`${result.skipped.length} skipped: ${result.skipped[0]!.reason}`)
        await refreshFinance()
        await load()
        router.refresh()
      } catch (e) {
        setError(errorText(e, "Could not save the payouts."))
      }
    })
  }

  function openConfirm() {
    setError(null)
    startTransition(async () => {
      const balance = await client.finance.paystackBalance().catch(() => null)
      setConfirming({ balanceKes: balance?.balanceKes ?? null })
    })
  }

  function send() {
    const batch = chosen.map((d) => ({ id: d.payout!.id, name: d.name, amountKes: d.payout!.amountKes, feeKes: d.payout!.estimatedFeeKes }))
    setSending(true)
    startTransition(async () => {
      try {
        const result = await client.payouts.disburse(batch.map((b) => b.id))
        const outcome = settleDisburse(batch, result)
        if (result.skipped.length) toast.warning(`${result.skipped.length} skipped: ${result.skipped[0]!.reason}`)
        setSent({
          rows: outcome.sent,
          skipped: outcome.skipped,
          totalKes: outcome.totalKes,
          feesKes: outcome.feesKes,
          at: new Date(),
        })
        await refreshFinance()
        await load()
        router.refresh()
      } catch (e) {
        setSending(false)
        setConfirming(null)
        setError(errorText(e, "Could not send the payouts."))
      }
    })
  }

  function closeReceipt() {
    setSent(null)
    setSending(false)
    setConfirming(null)
  }

  const short = confirming !== null && disburseBalanceCheck(confirming.balanceKes, totalKes, feesKes).state === "short"

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); closeReceipt() }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ArrowDownCircle aria-hidden />
          New payout run
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {sending || sent ? (
          <PayoutReceipt stage={stage} sent={sent} count={chosen.length} onDone={closeReceipt} />
        ) : confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Send driver payouts</DialogTitle>
              <DialogDescription>Money leaves the Paystack balance as soon as you confirm.</DialogDescription>
            </DialogHeader>
            <dl className="grid gap-2 text-sm">
              {[
                ["Drivers", String(chosen.length)],
                ["Total", formatKes(totalKes)],
                ["Estimated Paystack fees", formatKes(feesKes)],
                ["Paystack balance", confirming.balanceKes == null ? "Unavailable" : formatKes(confirming.balanceKes)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {short ? (
              <p role="alert" className="text-sm text-destructive">
                The Paystack balance doesn&rsquo;t cover the total plus fees. Top up the balance first.
              </p>
            ) : confirming.balanceKes == null ? (
              <p role="alert" className="text-sm text-destructive">
                Couldn&rsquo;t read the Paystack balance, so sending is paused. Go back and press Disburse again.
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={pending}>
                Back
              </Button>
              <Button onClick={send} loading={pending} loadingText="Sending…" disabled={short || confirming.balanceKes == null}>
                Send {formatKes(totalKes)} to {chosen.length} driver{chosen.length === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Payout run</DialogTitle>
              <DialogDescription>
                Approved drivers with payout details. Type each amount and save; saved rows stay pending and editable until
                they are disbursed.
              </DialogDescription>
            </DialogHeader>

            <div className="grid max-w-48 gap-1.5">
              <Label htmlFor="pr-month">Month</Label>
              <Input id="pr-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </div>

            {!run ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : run.drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved drivers have payout details yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      {canDisburse ? <th className="w-8 py-2" aria-label="Select" /> : null}
                      <th className="py-2">Driver</th>
                      <th className="py-2">Pays to</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {run.drivers.map((d) => {
                      const p = d.payout
                      const canSend = p && (p.status === "pending" || p.status === "failed")
                      return (
                        <tr key={d.driverProfileId}>
                          {canDisburse ? (
                            <td className="py-2">
                              {canSend ? (
                                <Checkbox
                                  aria-label={`Select ${d.name}`}
                                  checked={selected.has(p.id)}
                                  onCheckedChange={(checked) =>
                                    setSelected((prev) => {
                                      const next = new Set(prev)
                                      if (checked) next.add(p.id)
                                      else next.delete(p.id)
                                      return next
                                    })
                                  }
                                />
                              ) : null}
                            </td>
                          ) : null}
                          <td className="py-2 font-medium">{d.name}</td>
                          <td className="py-2 text-muted-foreground">
                            {d.method === "mpesa" ? "M-Pesa" : (d.bankName ?? "Bank")} {d.destinationMasked}
                          </td>
                          <td className="py-2">
                            {p ? (
                              <div className="flex max-w-56 flex-col items-start gap-1">
                                <StatusPill tone={payoutStatus(p.status).tone}>{payoutStatus(p.status).label}</StatusPill>
                                {p.failureReason && (p.status === "failed" || p.status === "reversed") ? (
                                  <span className="text-xs text-destructive">{p.failureReason}</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not saved</span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <Input
                              aria-label={`Amount for ${d.name}`}
                              className="ml-auto w-32 text-right"
                              inputMode="decimal"
                              disabled={!editable(p?.status)}
                              value={amounts[d.driverProfileId] ?? ""}
                              onChange={(e) => setAmounts((prev) => ({ ...prev, [d.driverProfileId]: e.target.value }))}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={save} loading={pending} loadingText="Saving…" disabled={!run}>
                Save as pending
              </Button>
              {canDisburse ? (
                <Button onClick={openConfirm} disabled={chosen.length === 0 || pending}>
                  Disburse {chosen.length > 0 ? `(${chosen.length})` : ""}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Sending: the printer works. Sent: it prints what went to Paystack. */
function PayoutReceipt({
  stage,
  sent,
  count,
  onDone,
}: {
  stage: ReturnType<typeof useReceiptPrinterStage>
  sent: SentRun | null
  count: number
  onDone: () => void
}) {
  const n = sent?.rows.length ?? count
  const title =
    stage !== "complete"
      ? "Sending payouts"
      : disburseReceiptTitle({ sent: sent?.rows ?? Array.from({ length: n }), skipped: sent?.skipped ?? [] })
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {stage === "complete" && n === 0
            ? "No money left the Paystack balance. The reason is under each driver below."
            : "Paystack confirms each transfer by webhook; rows move to settled or failed as they land."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-center py-2">
        <ReceiptPrinter.Root stage={stage} aria-label="Payout confirmation">
          <ReceiptPrinter.Machine>
            <ReceiptPrinter.Header>
              <span className="pt-1 pl-1 text-[10px] font-semibold tracking-[0.25em] text-zinc-400 uppercase">Admobi</span>
            </ReceiptPrinter.Header>
            <ReceiptPrinter.Screen>
              <ReceiptPrinter.Status>
                {stage === "processing"
                  ? `Sending ${n} payout${n === 1 ? "" : "s"}`
                  : stage === "complete"
                    ? n === 0
                      ? "Not sent"
                      : "Sent to Paystack"
                    : undefined}
              </ReceiptPrinter.Status>
              <p className="mt-4 font-mono text-2xl tabular-nums">{sent ? formatKes(sent.totalKes) : "KES —"}</p>
              <p className="mt-1 text-xs text-zinc-500">Driver payouts</p>
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>
          <ReceiptPrinter.Output>
            <ReceiptPrinter.Paper>
              <p className="text-center text-sm font-semibold tracking-[0.2em] uppercase">Admobi</p>
              <p className="mt-1 text-center text-[11px] text-zinc-500">
                Payout run · {sent ? sent.at.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }) : ""}
              </p>
              <ReceiptPrinter.Rule />
              <div className="grid gap-1.5">
                {sent?.rows.map((r) => <ReceiptPrinter.Row key={r.id} label={r.name} value={formatKes(r.amountKes)} />)}
              </div>
              <ReceiptPrinter.Rule />
              <div className="grid gap-1.5">
                <ReceiptPrinter.Row label="Drivers" value={String(sent?.rows.length ?? 0)} />
                <ReceiptPrinter.Row label="Est. Paystack fees" value={sent ? formatKes(sent.feesKes) : "—"} />
              </div>
              <ReceiptPrinter.Rule />
              <ReceiptPrinter.Row label="Total sent" value={sent ? formatKes(sent.totalKes) : "—"} strong />
              {sent?.skipped.length ? (
                <>
                  <ReceiptPrinter.Rule />
                  <p className="text-[11px] font-semibold">Not sent</p>
                  <ul className="mt-1 grid gap-1.5">
                    {sent.skipped.map((s) => (
                      <li key={s.name} className="text-[11px]">
                        <span className="font-medium">{s.name}</span>
                        <span className="block text-zinc-500">{s.reason}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </ReceiptPrinter.Paper>
          </ReceiptPrinter.Output>
        </ReceiptPrinter.Root>
      </div>
      <DialogFooter>
        <Button onClick={onDone} disabled={stage !== "complete"}>
          Done
        </Button>
      </DialogFooter>
    </>
  )
}

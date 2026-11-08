"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatKes } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { ReceiptPrinter, useReceiptPrinterStage } from "@workspace/ui/components/receipt-printer"

import { formatDate } from "@/components/billing/format"
import { useCheckoutCampaign } from "@/lib/use-campaigns"
import { usePaymentStatus, type PaymentStatusView } from "@/lib/use-payments"

const CHANNELS: Record<string, string> = {
  mobile_money: "M-Pesa",
  card: "Card",
  bank: "Bank",
  bank_transfer: "Bank transfer",
}

/** Where Paystack sends the payer back. Polls until the webhook (or our own verify) settles it. */
export function PaymentReturnView() {
  const params = useSearchParams()
  const reference = params.get("reference") ?? params.get("trxref")
  const status = usePaymentStatus(reference)
  const retry = useCheckoutCampaign()
  const view = status.data

  const failed = view?.status === "failed" || view?.status === "abandoned"

  if (!reference || status.isError) {
    return (
      <Notice title="We couldn't find that payment" body="If money left your account, it will show in your balance shortly.">
        <Button asChild variant="outline">
          <Link href="/billing">Go to billing</Link>
        </Button>
      </Notice>
    )
  }

  if (failed) {
    return (
      <Notice title="Payment didn't go through" body="Nothing was charged. You can try again.">
        {view.campaignId ? (
          <Button
            loading={retry.isPending || retry.isSuccess}
            loadingText="Opening payment…"
            onClick={() => retry.mutate(view.campaignId!)}
          >
            Try again
          </Button>
        ) : (
          <Button asChild>
            <Link href="/billing">Try again</Link>
          </Button>
        )}
      </Notice>
    )
  }

  if (view?.status === "amount_mismatch") {
    return (
      <Notice
        title="We're checking your payment"
        body="Your payment needs a manual check. We'll update you within one working day."
      />
    )
  }

  return <PrintedReceipt view={view} reference={reference} gaveUp={status.gaveUp} />
}

/** Pending: the printer works. Settled: it prints the receipt, then offers the next step. */
function PrintedReceipt({ view, reference, gaveUp }: { view?: PaymentStatusView; reference: string; gaveUp: boolean }) {
  const paid = view?.status === "success"
  const stage = useReceiptPrinterStage(paid)
  const amount = view ? formatKes(view.amountKes) : "KES —"
  const purpose = view?.campaignId ? "Campaign payment" : "Balance top-up"

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 py-10">
      <ReceiptPrinter.Root stage={stage} aria-label="Payment confirmation">
        <ReceiptPrinter.Machine>
          <ReceiptPrinter.Header>
            <span className="pt-1 pl-1 text-[10px] font-semibold tracking-[0.25em] text-zinc-400 uppercase">Admobi</span>
            <span aria-hidden className="mt-1.5 mr-1 flex gap-1.5">
              <span className={`size-1.5 rounded-full ${paid ? "bg-green-400" : "bg-zinc-600"}`} />
              <span className={`size-1.5 rounded-full ${paid ? "bg-zinc-600" : "animate-pulse bg-amber-400"}`} />
            </span>
          </ReceiptPrinter.Header>
          <ReceiptPrinter.Screen>
            <ReceiptPrinter.Status>
              {stage === "processing" ? (gaveUp ? "Still confirming" : "Confirming payment") : undefined}
            </ReceiptPrinter.Status>
            <p className="mt-4 font-mono text-2xl tabular-nums">{amount}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {stage === "processing"
                ? gaveUp
                  ? "Taking longer than usual. We'll notify you when it lands."
                  : "Approve the M-Pesa prompt on your phone if you haven't yet."
                : purpose}
            </p>
          </ReceiptPrinter.Screen>
        </ReceiptPrinter.Machine>

        <ReceiptPrinter.Output>
          <ReceiptPrinter.Paper>
            <p className="text-center text-sm font-semibold tracking-[0.2em] uppercase">Admobi</p>
            <p className="mt-1 text-center text-[11px] text-zinc-500">Payment receipt</p>
            <ReceiptPrinter.Rule />
            <div className="grid gap-1.5">
              <ReceiptPrinter.Row label="Date" value={view?.paidAt ? formatDate(view.paidAt) : "—"} />
              <ReceiptPrinter.Row label="Reference" value={view?.reference ?? reference} />
              <ReceiptPrinter.Row
                label="Method"
                value={view?.channel ? (CHANNELS[view.channel] ?? view.channel.replace(/_/g, " ")) : "—"}
              />
              <ReceiptPrinter.Row label="Invoice" value={view?.invoiceNumber ?? "—"} />
              <ReceiptPrinter.Row label="For" value={purpose} />
            </div>
            <ReceiptPrinter.Rule />
            <ReceiptPrinter.Row label="Total paid" value={amount} strong />
            <ReceiptPrinter.Rule />
            <p className="text-center text-[11px] text-zinc-500">
              {view?.campaignId ? "Added to your balance. Your campaign is with our team for review." : "Added to your balance."}
            </p>
            <p className="mt-2 text-center text-[11px] text-zinc-500">Thank you</p>
          </ReceiptPrinter.Paper>
        </ReceiptPrinter.Output>
      </ReceiptPrinter.Root>

      {stage === "complete" ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/billing?tab=invoices">View invoice</Link>
          </Button>
          <Button asChild>
            <Link href={view?.campaignId ? `/campaigns/${view.campaignId}` : "/billing"}>
              {view?.campaignId ? "Back to campaign" : "Go to billing"}
            </Link>
          </Button>
        </div>
      ) : gaveUp ? (
        <Button asChild variant="outline">
          <Link href="/billing">Go to billing</Link>
        </Button>
      ) : null}
    </div>
  )
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center" aria-live="polite">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{body}</p>
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

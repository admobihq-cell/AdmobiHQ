"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { useCheckoutCampaign } from "@/lib/use-campaigns"
import { usePaymentStatus } from "@/lib/use-payments"

/** Where Paystack sends the payer back. Polls until the webhook (or our own verify) settles it. */
export function PaymentReturnView() {
  const params = useSearchParams()
  const reference = params.get("reference") ?? params.get("trxref")
  const status = usePaymentStatus(reference)
  const retry = useCheckoutCampaign()
  const view = status.data

  const failed = view?.status === "failed" || view?.status === "abandoned"

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center" aria-live="polite">
          {!reference || status.isError ? (
            <>
              <h1 className="text-xl font-semibold">We couldn&apos;t find that payment</h1>
              <p className="text-sm text-muted-foreground">
                If money left your account, it will show in your balance shortly.
              </p>
              <Button asChild variant="outline">
                <Link href="/billing">Go to billing</Link>
              </Button>
            </>
          ) : view?.status === "success" ? (
            <>
              <h1 className="text-xl font-semibold">Payment received</h1>
              <p className="text-sm text-muted-foreground">
                KES {view.amountKes.toLocaleString("en-KE", { maximumFractionDigits: 2 })} is in your balance
                {view.campaignId ? " and your campaign is with our team for review." : "."}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline">
                  <Link href="/billing?tab=invoices">View receipt</Link>
                </Button>
                {view.campaignId ? (
                  <Button asChild>
                    <Link href={`/campaigns/${view.campaignId}`}>Back to campaign</Link>
                  </Button>
                ) : null}
              </div>
            </>
          ) : failed ? (
            <>
              <h1 className="text-xl font-semibold">Payment didn&apos;t go through</h1>
              <p className="text-sm text-muted-foreground">Nothing was charged. You can try again.</p>
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
            </>
          ) : view?.status === "amount_mismatch" ? (
            <>
              <h1 className="text-xl font-semibold">We&apos;re checking your payment</h1>
              <p className="text-sm text-muted-foreground">
                Your payment needs a manual check. We&apos;ll update you within one working day.
              </p>
            </>
          ) : status.gaveUp ? (
            <>
              <h1 className="text-xl font-semibold">Still confirming your payment</h1>
              <p className="text-sm text-muted-foreground">
                This is taking longer than usual. We&apos;ll notify you as soon as it lands — you can leave this page.
              </p>
              <Button asChild variant="outline">
                <Link href="/billing">Go to billing</Link>
              </Button>
            </>
          ) : (
            <>
              <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
              <h1 className="text-xl font-semibold">Confirming your payment…</h1>
              <p className="text-sm text-muted-foreground">
                Approve the M-Pesa prompt on your phone if you haven&apos;t yet. This page updates by itself.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Banknote } from "lucide-react"
import { toast } from "sonner"
import {
  BILLING_PAYMENT_METHODS,
  BILLING_PAYMENT_METHOD_LABELS,
  formatKes,
  nairobiDay,
  recordBillingPaymentSchema,
  type BillingDocumentDto,
  type BillingPaymentMethod,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Button } from "@workspace/ui/components/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field, FieldError } from "@/components/billing/form-bits"
import { useOpsClient } from "@/lib/ops-client"

/** Money received outside Paystack, matched to this invoice. Never credits the wallet. */
export function RecordPaymentDialog({
  doc,
  onRecorded,
}: {
  doc: BillingDocumentDto
  onRecorded: (next: BillingDocumentDto) => Promise<void>
}) {
  const client = useOpsClient()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(doc.balanceKes))
  const [method, setMethod] = useState<BillingPaymentMethod>("bank")
  const [reference, setReference] = useState("")
  const [paidOn, setPaidOn] = useState(nairobiDay(new Date()))
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const record = useMutation({
    mutationFn: () => {
      const parsed = recordBillingPaymentSchema.safeParse({ amountKes: Number(amount), method, reference, paidOn, note })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the payment details")
      return client.billingDocuments.recordPayment(doc.id, parsed.data)
    },
    onSuccess: async (next) => {
      await onRecorded(next)
      toast.success(`Payment recorded on ${next.number}`)
      setOpen(false)
    },
    onError: (e) => setError(formatApiError(e)),
  })

  const reset = (next: boolean) => {
    setOpen(next)
    if (next) {
      setAmount(String(doc.balanceKes))
      setReference("")
      setNote("")
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button>
          <Banknote aria-hidden />
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment on {doc.number}</DialogTitle>
          <DialogDescription>
            For money received by bank, M-Pesa, cheque or cash. It marks the invoice paid and does not touch the
            advertiser&apos;s wallet.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            record.mutate()
          }}
        >
          <Field label="Amount (KES)" htmlFor="pay-amount" hint={`Balance ${formatKes(doc.balanceKes)}`}>
            <Input
              id="pay-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Method" htmlFor="pay-method">
              <Select value={method} onValueChange={(v) => setMethod(v as BillingPaymentMethod)}>
                <SelectTrigger id="pay-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {BILLING_PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Paid on" htmlFor="pay-date">
              <Input id="pay-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
          </div>
          <Field label="Reference" htmlFor="pay-ref" hint="Bank or M-Pesa transaction code">
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="QKX7Y2M1AB" />
          </Field>
          <Field label="Note" htmlFor="pay-note">
            <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <FieldError message={error ?? undefined} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={record.isPending} loadingText="Recording…">
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

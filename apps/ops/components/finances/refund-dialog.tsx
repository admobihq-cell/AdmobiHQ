"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRight } from "lucide-react"
import { toast } from "sonner"

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
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { refreshFinance } from "@/app/(dashboard)/finances/actions"
import { useOpsClient } from "@/lib/ops-client"
import { refundFormError, type RecordOptionsDto } from "@workspace/ops-contracts"

/**
 * Refund unused credit to the advertiser's original M-Pesa number or card (spec §5.5). The API
 * decides the split across payments and refuses more than the org's available balance.
 */
export function RefundDialog({ orgs }: { orgs: RecordOptionsDto["orgs"] }) {
  const client = useOpsClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  function reset() {
    setError(null)
    setOrgId("")
    setAmount("")
    setReason("")
  }

  function submit() {
    setError(null)
    const problem = refundFormError({ orgId, amount, reason })
    if (problem) return setError(problem)
    const amountKes = Number(amount)

    startTransition(async () => {
      try {
        const { refundIds } = await client.finance.refund({ orgId: Number(orgId), amountKes, reason: reason.trim() })
        await refreshFinance()
        toast.success(`Refund sent to Paystack (${refundIds.length} payment${refundIds.length === 1 ? "" : "s"})`)
        setOpen(false)
        reset()
        router.refresh()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not send the refund.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ArrowLeftRight aria-hidden />
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund unused credit</DialogTitle>
          <DialogDescription>
            Goes back to the original M-Pesa number or card, newest payment first. The balance drops now; Paystack can
            take up to 10 business days. Money paid by bank transfer is refunded outside the system and recorded as
            &ldquo;Refund to payer&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="rf-org">Organization</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger id="rf-org" className="w-full">
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rf-amount">Amount (KES)</Label>
            <Input id="rf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            <p className="text-xs text-muted-foreground">At most the org&rsquo;s available balance.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rf-reason">Reason</Label>
            <Textarea id="rf-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Support case #123: unused credit" />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} loadingText="Sending…">
            Send refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

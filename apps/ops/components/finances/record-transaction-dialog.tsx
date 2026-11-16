"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import {
  SPEND_CATEGORIES,
  SPEND_CATEGORY_LABELS,
  WALLET_TRANSACTION_KINDS,
  recordTransactionSchema,
  type WalletTransactionKind,
} from "@workspace/ops-contracts"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { refreshFinance } from "@/app/(dashboard)/finances/actions"
import { useOpsClient } from "@/lib/ops-client"
import type { RecordOptionsDto } from "@/lib/queries/finance"

const KIND_LABEL: Record<WalletTransactionKind, string> = {
  top_up: "Top-up",
  spend: "Spend",
  refund: "Refund",
  adjustment: "Adjustment",
}

const KIND_HELP: Record<WalletTransactionKind, string> = {
  top_up: "Money the advertiser paid in. Enter a positive amount.",
  spend: "A charge against a campaign. Enter a positive amount; it is recorded as a debit.",
  refund: "Money returned to the wallet. Enter a positive amount.",
  adjustment: "A correction. Enter a negative amount to take money out, or a positive one to add it.",
}

const NONE = "none"

/**
 * Record a wallet ledger row by hand. The ledger is append-only, so a mistake is corrected with
 * an adjustment, not an edit. The form checks the same rules as the API; the API still decides.
 */
export function RecordTransactionDialog({ options }: { options: RecordOptionsDto }) {
  const client = useOpsClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState("")
  const [kind, setKind] = useState<WalletTransactionKind>("top_up")
  const [amount, setAmount] = useState("")
  const [campaignId, setCampaignId] = useState(NONE)
  const [category, setCategory] = useState(NONE)
  const [reference, setReference] = useState("")
  const [reason, setReason] = useState("")

  const campaigns = options.campaigns.filter((c) => String(c.orgId) === orgId)
  const needsCategory = kind === "spend" || kind === "refund"

  function reset() {
    setError(null)
    setOrgId("")
    setKind("top_up")
    setAmount("")
    setCampaignId(NONE)
    setCategory(NONE)
    setReference("")
    setReason("")
  }

  function submit() {
    setError(null)
    const parsed = recordTransactionSchema.safeParse({
      orgId: Number(orgId),
      kind,
      amountKes: Number(amount),
      campaignId: campaignId === NONE ? undefined : Number(campaignId),
      spendCategory: category === NONE ? undefined : category,
      reference: reference.trim() || undefined,
      reason,
    })
    if (!orgId) return setError("Choose an organization.")
    if (!amount.trim() || Number.isNaN(Number(amount))) return setError("Enter an amount.")
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form.")

    startTransition(async () => {
      try {
        await client.finance.recordTransaction(parsed.data)
        await refreshFinance()
        toast.success("Transaction recorded")
        setOpen(false)
        reset()
        router.refresh()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not record the transaction.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden />
          Record transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a transaction</DialogTitle>
          <DialogDescription>
            Adds a row to an advertiser&rsquo;s wallet. It is audited and cannot be edited or deleted afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="rt-org">Organization</Label>
            <Select value={orgId} onValueChange={(v) => { setOrgId(v); setCampaignId(NONE) }}>
              <SelectTrigger id="rt-org" className="w-full">
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {options.orgs.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rt-kind">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as WalletTransactionKind)}>
                <SelectTrigger id="rt-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WALLET_TRANSACTION_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rt-amount">Amount (KES)</Label>
              <Input id="rt-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{KIND_HELP[kind]}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rt-campaign">Campaign (optional)</Label>
              <Select value={campaignId} onValueChange={setCampaignId} disabled={!orgId}>
                <SelectTrigger id="rt-campaign" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No campaign</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rt-category">Category{needsCategory ? "" : " (optional)"}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="rt-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {SPEND_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {SPEND_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="rt-ref">Reference (optional)</Label>
            <Input id="rt-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="M-Pesa code or invoice number" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rt-reason">Reason</Label>
            <Textarea id="rt-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why this entry is being made" />
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
          <Button onClick={submit} loading={pending} loadingText="Recording…">
            Record transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import type { BulkReviewResult } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

type Decision = "approve" | "reject"

/** Bulk approve / reject for a review queue's selected rows. Both go through
 * a confirm that states the count; reject needs one reason, which the
 * advertiser or driver sees on every row it applies to. */
export function BulkReviewActions({
  count,
  noun,
  onApprove,
  onReject,
  onDone,
}: {
  count: number
  noun: string
  onApprove: () => Promise<BulkReviewResult>
  onReject: (reason: string) => Promise<BulkReviewResult>
  onDone: () => void
}) {
  const [open, setOpen] = useState<Decision | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const close = () => {
    setOpen(null)
    setReason("")
  }

  const run = async () => {
    if (!open) return
    setBusy(true)
    try {
      const result = open === "approve" ? await onApprove() : await onReject(reason.trim())
      const verb = open === "approve" ? "approved" : "rejected"
      const skipped = result.skipped.length
        ? `, ${result.skipped.length} skipped (not in review)`
        : ""
      toast.success(`${result.updated.length} ${verb}${skipped}`)
      close()
      onDone()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen("approve")}>
        <Check data-icon="inline-start" />
        Approve
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen("reject")}>
        <X data-icon="inline-start" />
        Reject
      </Button>

      <AlertDialog open={open !== null} onOpenChange={(next) => !next && !busy && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {open === "approve" ? "Approve" : "Reject"} {count} {noun}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Only items still in review change; anything already decided is skipped. Each one
              gets its usual email and notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {open === "reject" ? (
            <div className="grid gap-2">
              <Label htmlFor="bulk-reject-reason">Reason (shown to each of them)</Label>
              <Textarea
                id="bulk-reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
                rows={4}
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || (open === "reject" && !reason.trim())}
              onClick={(e) => {
                e.preventDefault()
                void run()
              }}
            >
              {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              {open === "approve" ? "Approve" : "Reject"} {count}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

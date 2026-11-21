"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Ban, Check, FileOutput, MoreHorizontal, Send, X } from "lucide-react"
import { toast } from "sonner"
import type { BillingDocumentDto, BillingStatusAction } from "@workspace/ops-contracts"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { RecordPaymentDialog } from "@/components/billing/record-payment-dialog"
import { useOpsClient } from "@/lib/ops-client"

const DONE: Record<BillingStatusAction, string> = {
  send: "Marked as sent",
  accept: "Quote accepted",
  decline: "Quote declined",
  void: "Voided",
}

type Confirm = "send" | "void" | null

/**
 * The lifecycle buttons for a saved document. Only what is valid for the
 * current state is shown: one primary action, the rest in a menu.
 */
export function DocumentActions({
  doc,
  saveIfDirty,
}: {
  doc: BillingDocumentDto
  saveIfDirty: () => Promise<BillingDocumentDto | null>
}) {
  const client = useOpsClient()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<Confirm>(null)

  const adopt = async (next: BillingDocumentDto) => {
    queryClient.setQueryData(["billing-documents", next.id], next)
    await queryClient.invalidateQueries({ queryKey: ["billing-documents"], exact: true })
  }

  const status = useMutation({
    mutationFn: (action: BillingStatusAction) => client.billingDocuments.changeStatus(doc.id, action),
    onSuccess: async (next, action) => {
      await adopt(next)
      if (action === "send" && next.emailError) {
        // The send went through; only the email didn't. Say so plainly and keep it on screen.
        toast.warning(`${DONE.send}: ${next.number}`, { description: next.emailError, duration: 10_000 })
      } else if (action === "send" && next.emailedTo) {
        toast.success(`${DONE.send}: ${next.number}`, { description: `Emailed to ${next.emailedTo} with the PDF attached.` })
      } else {
        toast.success(`${DONE[action]}: ${next.number}`)
      }
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  const convert = useMutation({
    mutationFn: () => client.billingDocuments.convert(doc.id),
    onSuccess: async (invoice) => {
      queryClient.setQueryData(["billing-documents", invoice.id], invoice)
      await queryClient.invalidateQueries({ queryKey: ["billing-documents"] })
      toast.success(`Created ${invoice.number} from this quote`)
      router.push(`/finances/documents/${invoice.id}`)
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  const isQuote = doc.kind === "quote"
  // A saved draft holds a number too; voiding retires it without showing anyone.
  const canVoid = doc.status !== "void"
  const canConvert = isQuote && (doc.status === "sent" || doc.status === "accepted") && !doc.convertedInvoiceId
  const canPay = !isQuote && doc.status === "sent" && doc.paymentState !== "paid"
  const busy = status.isPending || convert.isPending

  const audience = doc.orgName ? `Advertisers in ${doc.orgName} will see it in Billing and can download the PDF.` : "It has no customer organization, so no advertiser will see it."

  return (
    <>
      {doc.status === "draft" ? (
        <Button onClick={() => setConfirm("send")} disabled={busy}>
          <Send aria-hidden />
          Mark as sent
        </Button>
      ) : null}
      {canPay ? <RecordPaymentDialog doc={doc} onRecorded={adopt} /> : null}
      {canConvert ? (
        <Button onClick={() => convert.mutate()} loading={convert.isPending} loadingText="Converting…">
          <FileOutput aria-hidden />
          Convert to invoice
        </Button>
      ) : null}
      {doc.convertedInvoiceId ? (
        <Button asChild variant="outline">
          <Link href={`/finances/documents/${doc.convertedInvoiceId}`}>View invoice</Link>
        </Button>
      ) : null}

      {canVoid || (isQuote && doc.status === "sent") ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More actions" disabled={busy}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isQuote && doc.status === "sent" ? (
              <>
                <DropdownMenuItem onSelect={() => status.mutate("accept")}>
                  <Check aria-hidden />
                  Mark accepted
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => status.mutate("decline")}>
                  <X aria-hidden />
                  Mark declined
                </DropdownMenuItem>
              </>
            ) : null}
            {canVoid ? (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("void")}>
                <Ban aria-hidden />
                Void {isQuote ? "quote" : "invoice"}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "void" ? `Void ${doc.number}?` : `Send ${doc.number}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "void"
                ? "This can't be undone. The number stays used, and the PDF will show VOID."
                : `The document locks once sent. ${audience} ${
                    doc.customer.email
                      ? `The PDF will be emailed to ${doc.customer.email}.`
                      : "There's no email address on it, so nothing will be emailed."
                  }`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm === "void" ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
              onClick={async () => {
                const action = confirm
                setConfirm(null)
                if (action === "send") {
                  // Unsaved edits go out with it, never silently dropped.
                  const current = await saveIfDirty()
                  if (!current) return
                }
                if (action) status.mutate(action)
              }}
            >
              {confirm === "void" ? "Void" : "Mark as sent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

"use client"

import { FileDown } from "lucide-react"
import { exportFileName, formatKes, type InvoiceDto } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { INVOICE_STATUS, formatDate } from "@/components/billing/format"
import { useDownloadPdf } from "@/lib/use-campaigns"

/** A preview of one invoice, laid out like the PDF, with the org's billing details. */
export function InvoiceSheet({
  invoice,
  billingEmail,
  taxPin,
  onClose,
}: {
  invoice: InvoiceDto | null
  billingEmail: string | null
  taxPin: string | null
  onClose: () => void
}) {
  const download = useDownloadPdf()

  return (
    <Sheet open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {invoice ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Invoice {invoice.number}
                <StatusPill tone={INVOICE_STATUS[invoice.status].tone}>
                  {INVOICE_STATUS[invoice.status].label}
                </StatusPill>
              </SheetTitle>
              <SheetDescription>
                {formatDate(invoice.periodStart)} to {formatDate(invoice.periodEnd)}
                {invoice.campaignName ? ` · ${invoice.campaignName}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-4 pb-4">
              <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/20 p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Issued</dt>
                  <dd className="font-medium">{formatDate(invoice.issuedOn)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Due</dt>
                  <dd className="font-medium">{formatDate(invoice.dueOn)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Billing email</dt>
                  <dd className="font-medium break-all">{billingEmail ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">KRA PIN</dt>
                  <dd className="font-medium">{taxPin ?? "Not set"}</dd>
                </div>
              </dl>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Description</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 pr-3">{line.description}</td>
                      <td className="py-2 text-right tabular-nums">{formatKes(line.amountKes)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="tabular-nums">
                  <tr>
                    <td className="pt-3 text-muted-foreground">Subtotal</td>
                    <td className="pt-3 text-right">{formatKes(invoice.subtotalKes)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-muted-foreground">Tax</td>
                    <td className="py-1 text-right">{formatKes(invoice.taxKes)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="pt-1">Total</td>
                    <td className="pt-1 text-right">{formatKes(invoice.totalKes)}</td>
                  </tr>
                </tfoot>
              </table>

              <p className="text-xs text-muted-foreground">
                This is a statement of charges, not a tax invoice. Tax invoices follow once eTIMS is connected.
              </p>

              <Button
                loading={download.isPending}
                loadingText="Preparing…"
                onClick={() =>
                  download.mutate({
                    path: `/v1/customer/finance/invoices/${invoice.id}/pdf`,
                    filename: exportFileName("invoice", invoice.number, "pdf"),
                  })
                }
              >
                <FileDown data-icon="inline-start" />
                Download PDF
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

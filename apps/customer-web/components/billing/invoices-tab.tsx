"use client"

import { useState } from "react"
import Link from "next/link"
import { FileDown } from "lucide-react"
import { exportFileName, formatKes, type InvoiceDto } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { AlertStrip } from "@workspace/ui/components/dashboard/notes"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { INVOICE_STATUS, formatDate } from "@/components/billing/format"
import { useInvoices } from "@/lib/use-analytics"
import { useDownloadPdf } from "@/lib/use-campaigns"
import { useOrg } from "@/lib/use-org"

export function InvoicesTab() {
  const [selected, setSelected] = useState<InvoiceDto | null>(null)
  const query = useInvoices()
  const org = useOrg().data
  const download = useDownloadPdf()
  const invoices = query.data ?? []

  const sum = (rows: InvoiceDto[]) => rows.reduce((total, i) => total + i.totalKes, 0)
  const open = invoices.filter((i) => i.status === "issued")
  const overdue = invoices.filter((i) => i.status === "overdue")
  const year = String(new Date().getFullYear())
  const paidThisYear = invoices.filter((i) => i.status === "paid" && (i.paidAt ?? i.issuedOn).startsWith(year))

  const columns: LedgerColumn<InvoiceDto>[] = [
    {
      key: "number",
      header: "Number",
      render: (i) => <span className="font-medium">{i.number}</span>,
    },
    { key: "period", header: "Period", render: (i) => `${formatDate(i.periodStart)} to ${formatDate(i.periodEnd)}` },
    { key: "campaign", header: "Campaign", render: (i) => i.campaignName ?? "All campaigns" },
    { key: "amount", header: "Amount", align: "right", render: (i) => formatKes(i.totalKes) },
    { key: "tax", header: "Tax", align: "right", render: (i) => formatKes(i.taxKes) },
    { key: "due", header: "Due", render: (i) => formatDate(i.dueOn) },
    {
      key: "status",
      header: "Status",
      render: (i) => <StatusPill tone={INVOICE_STATUS[i.status].tone}>{INVOICE_STATUS[i.status].label}</StatusPill>,
    },
    {
      key: "pdf",
      header: <span className="sr-only">PDF</span>,
      render: (i) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Download invoice ${i.number} as PDF`}
          onClick={(event) => {
            event.stopPropagation()
            download.mutate({
              path: `/v1/customer/finance/invoices/${i.id}/pdf`,
              filename: exportFileName("invoice", i.number, "pdf"),
            })
          }}
        >
          <FileDown />
        </Button>
      ),
    },
  ]

  if (query.isError) {
    return (
      <ApiErrorBanner
        message={query.error instanceof Error ? query.error.message : "Could not load invoices."}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const missingDetails = org && (!org.billingEmail || !org.taxPin)

  return (
    <div className="grid gap-4">
      {missingDetails ? (
        <AlertStrip
          title="Add your billing details"
          body="Invoices carry your billing email and KRA PIN. Add them so they reach the right person."
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings/team">Open organization settings</Link>
            </Button>
          }
        />
      ) : null}
      <LedgerCard
        title="Invoices"
        description="Charges issued by your account manager"
        summary={[
          { label: "Open", value: formatKes(sum(open)), note: `${open.length} awaiting payment` },
          { label: "Overdue", value: formatKes(sum(overdue)), note: `${overdue.length} past due` },
          { label: "Paid this year", value: formatKes(sum(paidThisYear)), note: `${paidThisYear.length} paid` },
        ]}
        columns={columns}
        rows={invoices}
        rowKey={(i) => String(i.id)}
        onRowClick={setSelected}
        footer={{ viewing: `Viewing ${invoices.length} out of ${invoices.length}`, page: 1, pageCount: 1, onPageChange: () => {} }}
        empty={query.isPending ? "Loading invoices." : "Invoices appear here once your account manager issues one."}
      />
      <InvoiceSheet
        invoice={selected}
        billingEmail={org?.billingEmail ?? null}
        taxPin={org?.taxPin ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
